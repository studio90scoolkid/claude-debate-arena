export type Persona = 'pro' | 'neutral' | 'con';

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

export type ModelAlias = 'haiku' | 'sonnet' | 'opus';

export interface WebviewMessage {
  type: 'startDebate' | 'stopDebate' | 'pauseDebate' | 'resumeDebate' | 'checkConnection' | 'saveSettings';
  topic?: string;
  personaA?: Persona;
  personaB?: Persona;
  modelA?: ModelAlias;
  modelB?: ModelAlias;
  nameA?: string;
  nameB?: string;
  seekConsensus?: boolean;
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

export interface ExtensionMessage {
  type: 'newMessage' | 'stateChange' | 'error' | 'thinking' | 'connectionStatus' | 'usageUpdate' | 'loadSettings' | 'summary' | 'summaryLoading';
  payload: unknown;
}

export const MODEL_LABELS: Record<ModelAlias, string> = {
  haiku: 'Haiku (Fast)',
  sonnet: 'Sonnet (Balanced)',
  opus: 'Opus (Powerful)',
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
