import { EventEmitter } from 'events';
import { ClaudeAgent } from './ClaudeAgent';
import { DebateMessage, DebateState, ModelAlias, Persona, TokenUsage } from './types';

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
    this.abortController = new AbortController();
    const myLoopId = ++this.loopId;

    this.emitStateChange();
    this.runLoop(myLoopId, modelA, modelB).catch(err => {
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
      // Models are passed from the original start - we store them
      this.runLoop(myLoopId, this._modelA, this._modelB).catch(err => {
        if (err.message !== 'Aborted') {
          this.emit('error', err.message);
        }
      });
    }
  }

  async stop(): Promise<void> {
    this.state.status = 'stopped';
    this.loopId++;
    this.abortController?.abort();
    this.abortController = null;
    this.emitStateChange();
  }

  private _modelA: ModelAlias = 'sonnet';
  private _modelB: ModelAlias = 'sonnet';

  private async runLoop(id: number, modelA: ModelAlias, modelB: ModelAlias): Promise<void> {
    this._modelA = modelA;
    this._modelB = modelB;
    const MAX_RETRIES = 2;

    while (id === this.loopId && this.state.status === 'running') {
      const isA = this.state.currentTurn === 'A';
      const currentAgent = isA
        ? new ClaudeAgent(this._nameA, this.state.personaA, modelA, this._nameB, this._seekConsensus)
        : new ClaudeAgent(this._nameB, this.state.personaB, modelB, this._nameA, this._seekConsensus);
      const currentPersona = this.state.currentTurn === 'A' ? this.state.personaA : this.state.personaB;

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
        return;
      }

      this.state.currentTurn = this.state.currentTurn === 'A' ? 'B' : 'A';

      await sleep(1500);
    }
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.state.status);
  }
}
