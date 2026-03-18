import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { ClaudeAgent, findClaudePath, makeCleanEnv } from './ClaudeAgent';
import { GeminiAgent, findGeminiPath } from './GeminiAgent';
import { AIAgent, DebateMessage, DebateState, ModelAlias, Persona, Provider, TokenUsage } from './types';

const MAX_MESSAGES = 200;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class DebateManager extends EventEmitter {
  private state: DebateState = {
    status: 'idle',
    topic: '',
    messages: [],
    currentTurn: 'A',
    personaA: 'pro',
    personaB: 'con',
  };

  private abortController: AbortController | null = null;
  private loopId = 0;
  private _nameA = 'Agent A';
  private _nameB = 'Agent B';
  private _seekConsensus = false;
  private _modelA: ModelAlias = 'sonnet';
  private _modelB: ModelAlias = 'sonnet';
  private _providerA: Provider = 'claude';
  private _providerB: Provider = 'claude';

  // Persistent agents — maintain their own CLI sessions
  private agentA: AIAgent | null = null;
  private agentB: AIAgent | null = null;

  getState(): DebateState {
    return { ...this.state, messages: [...this.state.messages] };
  }

  async startDebate(
    topic: string,
    personaA: Persona = 'pro',
    personaB: Persona = 'con',
    modelA: ModelAlias = 'sonnet',
    modelB: ModelAlias = 'sonnet',
    nameA = 'Agent A',
    nameB = 'Agent B',
    seekConsensus = false,
    providerA: Provider = 'claude',
    providerB: Provider = 'claude',
  ): Promise<void> {
    // Stop any existing debate
    if (this.state.status === 'running' || this.state.status === 'paused') {
      await this.stop();
      await sleep(300);
    }

    this.state = {
      status: 'running',
      topic,
      messages: [],
      currentTurn: 'A',
      personaA,
      personaB,
    };

    this._nameA = nameA || 'Agent A';
    this._nameB = nameB || 'Agent B';
    this._seekConsensus = seekConsensus;
    this._modelA = modelA;
    this._modelB = modelB;
    this._providerA = providerA;
    this._providerB = providerB;

    // Create persistent agents with their own sessions
    this.agentA = this.createAgent(providerA, this._nameA, personaA, modelA, this._nameB, seekConsensus);
    this.agentB = this.createAgent(providerB, this._nameB, personaB, modelB, this._nameA, seekConsensus);

    this.abortController = new AbortController();
    const myLoopId = ++this.loopId;

    this.emitStateChange();
    this.runLoop(myLoopId).catch(err => {
      if (err.message !== 'Aborted') {
        this.emit('error', err.message);
      }
    });
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.abortController?.abort();
      this.abortController = new AbortController();
      this.emitStateChange();
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.abortController = new AbortController();
      const myLoopId = ++this.loopId;
      this.emitStateChange();
      // Agents persist across pause/resume — sessions are maintained
      this.runLoop(myLoopId).catch(err => {
        if (err.message !== 'Aborted') {
          this.emit('error', err.message);
        }
      });
    }
  }

  async stop(): Promise<void> {
    const hadMessages = this.state.messages.length > 0;
    this.state.status = 'stopped';
    this.loopId++;
    this.abortController?.abort();
    this.abortController = null;
    // Agents are discarded — sessions end naturally
    this.agentA = null;
    this.agentB = null;
    this.emitStateChange();
    if (hadMessages) {
      this.generateSummary();
    }
  }

  private async runLoop(id: number): Promise<void> {
    const MAX_RETRIES = 2;

    while (id === this.loopId && this.state.status === 'running') {
      const isA = this.state.currentTurn === 'A';
      const currentAgent = isA ? this.agentA! : this.agentB!;
      const currentPersona = isA ? this.state.personaA : this.state.personaB;

      this.emit('thinking', this.state.currentTurn);

      let response: { text: string; usage?: TokenUsage } | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (id !== this.loopId || this.state.status !== 'running') { return; }
        try {
          response = await currentAgent.respond(
            this.state.topic,
            this.state.messages,
            this.abortController?.signal,
          );
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'Aborted' || id !== this.loopId) { return; }
          if (attempt === MAX_RETRIES) {
            this.emit('error', `${currentAgent.name} 응답 실패: ${msg}`);
            this.state.status = 'paused';
            this.emitStateChange();
            return;
          }
          await sleep(2000);
        }
      }

      if (!response || id !== this.loopId || this.state.status !== 'running') { return; }

      const message: DebateMessage = {
        agent: this.state.currentTurn,
        persona: currentPersona,
        content: response.text,
        timestamp: Date.now(),
        usage: response.usage,
      };

      // Strip consensus marker from displayed text
      const hasConsensus = response.text.includes('[CONSENSUS_REACHED]');
      if (hasConsensus) {
        message.content = message.content.replace(/\s*\[CONSENSUS_REACHED\]\s*/g, '').trim();
      }

      this.state.messages.push(message);
      if (this.state.messages.length > MAX_MESSAGES) {
        this.state.messages = this.state.messages.slice(-MAX_MESSAGES);
      }
      this.emit('message', message);

      // Auto-stop when consensus is reached
      if (this._seekConsensus && hasConsensus) {
        this.state.status = 'stopped';
        this.emit('consensus');
        this.emitStateChange();
        this.generateSummary();
        return;
      }

      this.state.currentTurn = this.state.currentTurn === 'A' ? 'B' : 'A';

      await sleep(1500);
    }
  }

  private createAgent(
    provider: Provider,
    name: string,
    persona: Persona,
    model: ModelAlias,
    opponentName: string,
    seekConsensus: boolean,
  ): AIAgent {
    if (provider === 'gemini') {
      return new GeminiAgent(name, persona, model as any, opponentName, seekConsensus);
    }
    return new ClaudeAgent(name, persona, model as any, opponentName, seekConsensus);
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.state.status);
  }

  private generateSummary(): void {
    const messages = this.state.messages;
    if (messages.length === 0) { return; }

    const topic = this.state.topic;
    const nameA = this._nameA;
    const nameB = this._nameB;

    // Build debate transcript for the summary prompt
    const transcript = messages.map(m => {
      const name = m.agent === 'A' ? nameA : nameB;
      return `[${name}]: ${m.content}`;
    }).join('\n\n');

    const prompt = `You are a debate moderator/host. The following is a transcript of a debate between "${nameA}" and "${nameB}" on the topic: "${topic}".

Please provide a concise moderator's summary that includes:
1. The main arguments each side presented
2. Key points of agreement or disagreement
3. Which arguments were strongest
4. A brief closing remark as a moderator

IMPORTANT: Respond in the SAME LANGUAGE as the debate topic "${topic}". Detect the language and use it.
Keep the summary to 5-8 sentences. Use plain text only, no markdown formatting.

--- DEBATE TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---`;

    this.emit('summaryLoading');

    // Use Claude for summary by default; fall back to Gemini if both agents use Gemini
    const useGemini = this._providerA === 'gemini' && this._providerB === 'gemini';
    const cliPath = useGemini ? findGeminiPath() : findClaudePath();
    const env = useGemini ? { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` } : makeCleanEnv();
    const args = useGemini
      ? ['-p', prompt, '--output-format', 'json', '-m', 'gemini-2.5-flash']
      : ['-p', prompt, '--output-format', 'json', '--model', 'haiku'];

    const proc = spawn(cliPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', () => { /* ignore */ });

    const timeout = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* */ }
    }, 30_000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) { return; }
      try {
        const parsed = JSON.parse(stdout);
        const result = parsed.result || parsed.response || parsed.content || parsed.text || stdout;
        const text = typeof result === 'string' ? result.trim() : JSON.stringify(result);
        if (text) {
          this.emit('summary', text);
        }
      } catch {
        const text = stdout.trim();
        if (text) {
          this.emit('summary', text);
        }
      }
    });
  }
}
