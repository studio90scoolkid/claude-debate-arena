export type Persona = 'pro' | 'neutral' | 'con';

/** Common interface for all AI agent implementations */
export interface AIAgent {
  readonly name: string;
  readonly persona: Persona;
  readonly model: ModelAlias;
  readonly opponentName: string;
  respond(
    topic: string,
    history: DebateMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface DebateMessage {
  agent: 'A' | 'B';
  persona: Persona;
  content: string;
  timestamp: number;
  usage?: TokenUsage;
}

export type DebateStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface DebateState {
  status: DebateStatus;
  topic: string;
  messages: DebateMessage[];
  currentTurn: 'A' | 'B';
  personaA: Persona;
  personaB: Persona;
}

export type Provider = 'claude' | 'gemini';

export type ClaudeModelAlias = 'haiku' | 'sonnet' | 'opus';
export type GeminiModelAlias = 'gemini-2.5-flash' | 'gemini-2.5-pro';
export type ModelAlias = ClaudeModelAlias | GeminiModelAlias;

export interface WebviewMessage {
  type: 'startDebate' | 'stopDebate' | 'pauseDebate' | 'resumeDebate' | 'checkConnection' | 'saveSettings';
  topic?: string;
  personaA?: Persona;
  personaB?: Persona;
  providerA?: Provider;
  providerB?: Provider;
  modelA?: ModelAlias;
  modelB?: ModelAlias;
  nameA?: string;
  nameB?: string;
  seekConsensus?: boolean;
  showSummary?: boolean;
  settings?: Record<string, string>;
}

export interface AuthStatus {
  loggedIn: boolean;
  authMethod?: string;
  email?: string;
  orgName?: string;
  subscriptionType?: string;
  error?: string;
}

export interface ConsensusGauge {
  scoreA: number;
  scoreB: number;
  average: number;
}

export interface ExtensionMessage {
  type: 'newMessage' | 'stateChange' | 'error' | 'thinking' | 'connectionStatus' | 'loadSettings' | 'summary' | 'summaryLoading' | 'consensusGauge';
  payload: unknown;
}

export const CLAUDE_MODEL_LABELS: Record<ClaudeModelAlias, string> = {
  haiku: 'Haiku (Fast)',
  sonnet: 'Sonnet (Balanced)',
  opus: 'Opus (Powerful)',
};

export const GEMINI_MODEL_LABELS: Record<GeminiModelAlias, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
};

export const MODEL_LABELS: Record<ModelAlias, string> = {
  ...CLAUDE_MODEL_LABELS,
  ...GEMINI_MODEL_LABELS,
};

export const PERSONA_LABELS: Record<Persona, string> = {
  pro: 'Pro',
  neutral: 'Neutral',
  con: 'Con',
};

export const PERSONA_PROMPTS: Record<Persona, string> = {
  pro: `You are a debater who strongly supports the given topic.
Use logical evidence and specific examples to argue your position.
Each turn, you MUST present new arguments, cases, or data not mentioned before.
Repeating the same argument in different words is forbidden.
Alternate between economic, social, ethical, technical, and historical perspectives.
Identify your opponent's weaknesses precisely, but rebut politely.`,
  neutral: `You are a debater with a neutral stance on the given topic.
Analyze the pros and cons of both sides in a balanced way.
Each turn, present a new perspective or framework not previously covered.
Do not repeat previous analysis; approach from different stakeholders or situations.
Acknowledge valid parts of your opponent's argument while pointing out what they missed.`,
  con: `You are a debater who strongly opposes the given topic.
Present logical counterarguments from a critical perspective.
Each turn, you MUST present new counterarguments, counterexamples, or evidence not used before.
Repeating the same criticism in different words is forbidden.
Alternate between economic, social, ethical, technical, and historical perspectives.
Identify logical flaws in your opponent's argument precisely, but rebut politely.`,
};
