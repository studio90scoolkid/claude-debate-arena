import { EventEmitter } from 'events';
import { ChildProcess, spawn } from 'child_process';
import { ClaudeAgent, findClaudePath, makeCleanEnv } from './ClaudeAgent';
import { GeminiAgent, findGeminiPath } from './GeminiAgent';
import { CodexAgent, findCodexPath } from './CodexAgent';
import { AIAgent, DebateMessage, DebateMode, DebateState, ModelAlias, Persona, Provider, TokenUsage } from './types';

const MAX_MESSAGES = 200;

/** Valid model aliases per provider — prevents cross-provider model assignment */
const PROVIDER_MODELS: Record<Provider, readonly string[]> = {
  claude: ['haiku', 'sonnet', 'opus'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  codex: ['gpt-5.4', 'gpt-5.4-mini', 'o4-mini', 'o3-mini'],
};

/** Default model per provider */
const DEFAULT_MODEL: Record<Provider, ModelAlias> = {
  claude: 'sonnet',
  gemini: 'gemini-2.5-flash',
  codex: 'gpt-5.4-mini',
};

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
  private _showSummary = true;
  private _allowConcession = true;
  private _mode: DebateMode = 'general';
  private _cwd?: string;
  private _summaryProc: ChildProcess | null = null;

  // Consensus gauge tracking (0-100 per agent)
  private _consensusScoreA = 0;
  private _consensusScoreB = 0;
  private _hasScoreA = false;
  private _hasScoreB = false;

  // Persistent agents — maintain their own CLI sessions
  private agentA: AIAgent | null = null;
  private agentB: AIAgent | null = null;

  getState(): DebateState {
    return { ...this.state, messages: [...this.state.messages] };
  }

  getConsensusGauge(): { scoreA: number; scoreB: number; average: number } | null {
    if (!this._seekConsensus) { return null; }
    const avg = Math.round((this._consensusScoreA + this._consensusScoreB) / 2);
    return { scoreA: this._consensusScoreA, scoreB: this._consensusScoreB, average: avg };
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
    showSummary = true,
    allowConcession = true,
    mode: DebateMode = 'general',
    cwd?: string,
  ): Promise<void> {
    // Stop any existing debate
    if (this.state.status === 'running' || this.state.status === 'paused') {
      await this.stop();
      await sleep(300);
    }
    // Kill any lingering summary from previous debate
    this.killSummaryProc();

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
    this._consensusScoreA = 0;
    this._consensusScoreB = 0;
    this._hasScoreA = false;
    this._hasScoreB = false;
    this._showSummary = showSummary;
    this._allowConcession = allowConcession;
    this._mode = mode;
    this._cwd = cwd;
    this._modelA = modelA;
    this._modelB = modelB;
    this._providerA = providerA;
    this._providerB = providerB;

    // Create persistent agents with their own sessions
    this.agentA = this.createAgent(providerA, this._nameA, personaA, modelA, this._nameB, seekConsensus, allowConcession, mode, cwd, 'A');
    this.agentB = this.createAgent(providerB, this._nameB, personaB, modelB, this._nameA, seekConsensus, allowConcession, mode, cwd, 'B');

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
    // Kill any in-flight summary process
    this.killSummaryProc();
    // Agents are discarded — sessions end naturally
    this.agentA = null;
    this.agentB = null;
    this.emitStateChange();
    if (hadMessages && this._showSummary) {
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
            this.emit('error', `${currentAgent.name} failed to respond: ${msg}`);
            this.state.status = 'paused';
            this.emitStateChange();
            return;
          }
          await sleep(2000);
        }
      }

      if (!response || id !== this.loopId || this.state.status !== 'running') { return; }

      // Strip any markdown bold/italic markers that agents may include despite instructions
      const cleanText = response.text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');

      const message: DebateMessage = {
        agent: this.state.currentTurn,
        persona: currentPersona,
        content: cleanText,
        timestamp: Date.now(),
        usage: response.usage,
      };

      // Parse consensus score [CONSENSUS:XX] from response
      const scoreMatch = response.text.match(/\[CONSENSUS:(\d{1,3})\]/);
      if (this._seekConsensus && scoreMatch) {
        const score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
        if (isA) {
          this._consensusScoreA = score;
          this._hasScoreA = true;
        } else {
          this._consensusScoreB = score;
          this._hasScoreB = true;
        }
        // Strip the score marker from displayed text
        message.content = message.content.replace(/\s*\[CONSENSUS:\d{1,3}\]\s*/g, '').trim();
        // Only emit gauge once both agents have reported at least once
        if (this._hasScoreA && this._hasScoreB) {
          this.emit('consensusGauge', {
            scoreA: this._consensusScoreA,
            scoreB: this._consensusScoreB,
            average: Math.round((this._consensusScoreA + this._consensusScoreB) / 2),
          });
        }
      }

      // Strip consensus reached marker from displayed text
      const hasConsensus = response.text.includes('[CONSENSUS_REACHED]');
      if (hasConsensus) {
        message.content = message.content.replace(/\s*\[CONSENSUS_REACHED\]\s*/g, '').trim();
      }

      // Detect concession marker
      const hasConcession = this._allowConcession && response.text.includes('[CONCEDE]');
      if (hasConcession) {
        message.content = message.content.replace(/\s*\[CONCEDE\]\s*/g, '').trim();
      }

      this.state.messages.push(message);
      if (this.state.messages.length > MAX_MESSAGES) {
        this.state.messages = this.state.messages.slice(-MAX_MESSAGES);
      }
      this.emit('message', message);

      // Auto-stop when consensus is reached (both agents must have high scores)
      if (this._seekConsensus && hasConsensus && this._consensusScoreA >= 70 && this._consensusScoreB >= 70) {
        this.state.status = 'stopped';
        this.emit('consensus');
        this.emitStateChange();
        if (this._showSummary) { this.generateSummary(); }
        return;
      }

      // Auto-stop when an agent concedes defeat
      if (hasConcession) {
        this.state.status = 'stopped';
        const conceder = isA ? this._nameA : this._nameB;
        const winner = isA ? this._nameB : this._nameA;
        this.emit('concession', { conceder, winner });
        this.emitStateChange();
        if (this._showSummary) { this.generateSummary(); }
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
    allowConcession: boolean,
    mode: DebateMode = 'general',
    cwd?: string,
    agentSlot?: 'A' | 'B',
  ): AIAgent {
    // Validate model belongs to provider; fall back to default if mismatched
    const validModel = PROVIDER_MODELS[provider].includes(model) ? model : DEFAULT_MODEL[provider];

    if (provider === 'gemini') {
      return new GeminiAgent(name, persona, validModel as any, opponentName, seekConsensus, allowConcession, mode, cwd, agentSlot);
    }
    if (provider === 'codex') {
      return new CodexAgent(name, persona, validModel as any, opponentName, seekConsensus, allowConcession, mode, cwd, agentSlot);
    }
    return new ClaudeAgent(name, persona, validModel as any, opponentName, seekConsensus, allowConcession, mode, cwd, agentSlot);
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.state.status);
  }

  private killSummaryProc(): void {
    if (this._summaryProc) {
      try { this._summaryProc.kill('SIGTERM'); } catch { /* already dead */ }
      this._summaryProc = null;
    }
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

    const prompt = `You are writing a recap of a debate between "${nameA}" and "${nameB}" on the topic: "${topic}".

Write a neutral summary for someone reading the debate log afterward. There is no live audience.

Include:
1. Each side's core argument in 1-2 sentences
2. Where they agreed and where they stayed apart
3. Which argument landed hardest and why
4. One sentence closing thought on what this debate revealed

IMPORTANT: Respond in the SAME LANGUAGE as the debate topic "${topic}". Detect the language and use it.
Keep it to 5-8 sentences. Plain text only, no markdown. Do NOT address "viewers" or "audience" — just summarize directly. Do not overuse dashes (—).

--- DEBATE TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---`;

    this.emit('summaryLoading');

    // Use Claude for summary by default; fall back to Gemini/Codex if neither agent uses Claude
    const hasClaudeProvider = this._providerA === 'claude' || this._providerB === 'claude';
    const hasGeminiProvider = this._providerA === 'gemini' || this._providerB === 'gemini';
    let cliPath: string;
    let env: NodeJS.ProcessEnv;
    let args: string[];
    if (hasClaudeProvider) {
      cliPath = findClaudePath();
      env = makeCleanEnv();
      args = ['-p', prompt, '--output-format', 'json', '--model', 'opus'];
    } else if (hasGeminiProvider) {
      cliPath = findGeminiPath();
      env = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` };
      args = ['-p', prompt, '--output-format', 'json', '-m', 'gemini-2.5-pro'];
    } else {
      // Both agents use Codex
      cliPath = findCodexPath();
      env = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` };
      args = ['exec', prompt, '-m', 'gpt-5.4', '--json', '--full-auto'];
    }

    const proc = spawn(cliPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    this._summaryProc = proc;

    let stdout = '';
    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', () => { /* ignore */ });

    const timeout = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* */ }
    }, 30_000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      // Discard result if this process was already replaced or killed
      if (this._summaryProc !== proc) { return; }
      this._summaryProc = null;
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
