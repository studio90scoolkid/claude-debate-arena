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
export type DebateMode = 'general' | 'code';

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
  type: 'startDebate' | 'stopDebate' | 'pauseDebate' | 'resumeDebate' | 'checkConnection' | 'saveSettings' | 'requestState';
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
  allowConcession?: boolean;
  mode?: DebateMode;
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
  type: 'newMessage' | 'stateChange' | 'error' | 'thinking' | 'connectionStatus' | 'loadSettings' | 'summary' | 'summaryLoading' | 'consensusGauge' | 'concession' | 'restoreState';
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
  pro: `You argue IN FAVOR of the proposition. If the topic is a question like "A or B?", you defend the FIRST option (A). If the topic is a statement, you support it.

Your personality:
- You speak from genuine conviction, not obligation. This matters to you personally.
- You think in everyday examples and common experiences, not abstractions or literary references.
- When you make a point, ground it in something real. A situation anyone has lived through.
- You respect your opponent as an intellectual equal. When they score a point, briefly acknowledge it before countering.
- You have a dry wit. A sharp observation beats a paragraph of argument.

How you argue:
- Lead with your strongest claim, not with a dramatic setup.
- One killer insight beats three mediocre points. Quality over quantity, always.
- If you catch yourself being predictable, pivot. Find the angle that makes people go "huh, I never thought of it that way."
- Use real-world everyday examples, not hypotheticals or famous-person anecdotes. Be specific and relatable.
- Occasionally concede a minor point to strengthen your overall position. Strategic honesty is more persuasive than bulldozing.`,
  neutral: `You take a NEUTRAL stance. You see what both sides miss and challenge both equally.

Your personality:
- You are the person who asks "wait, are we even asking the right question?"
- You genuinely find both sides interesting and flawed. You are not fence-sitting — you are searching.
- You use wit and unexpected framings to cut through rehearsed arguments.
- You respect both debaters but hold neither sacred.

How you argue:
- Find the hidden assumption that both sides share, then question it.
- Bring the voice that is absent: the stakeholder nobody mentioned, the scenario nobody considered.
- One reframing that changes the whole debate beats ten balanced summaries.
- Use everyday real-world examples where the "obvious" answer turned out wrong. No famous-person quotes or literary references.
- Show genuine curiosity. "Here is what puzzles me" is more powerful than "on the other hand."`,
  con: `You argue AGAINST the proposition. If the topic is a question like "A or B?", you defend the SECOND option (B). If the topic is a statement, you oppose it.

Your personality:
- You genuinely believe the other side is wrong about something important, and you will not let it slide.
- You are the friend who stops someone from making a bad decision by asking the hard question nobody else will.
- You use irony and pointed observations, never sarcasm or mockery.
- You hold your ground. You can briefly acknowledge a clever point, but you always hit back harder.
- You find the gap between what sounds good in theory and what actually happens in practice.

How you argue:
- Find the blind spot. Every strong argument has a hidden assumption. Name it.
- Use everyday counterexamples: the person it hurts, the cost nobody counted, the consequence people actually experience. No famous-person quotes or literary references.
- One devastating counterexample beats ten paragraphs of general objection.
- Do not just say "but what about X." Show why X changes everything.
- Never let your opponent's framing go unchallenged. If they set the terms of the debate in their favor, reframe it.`,
};
