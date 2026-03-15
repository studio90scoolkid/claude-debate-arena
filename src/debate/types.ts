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
  type: 'newMessage' | 'stateChange' | 'error' | 'thinking' | 'connectionStatus' | 'usageUpdate' | 'loadSettings';
  payload: unknown;
}

export const MODEL_LABELS: Record<ModelAlias, string> = {
  haiku: 'Haiku (Fast)',
  sonnet: 'Sonnet (Balanced)',
  opus: 'Opus (Powerful)',
};

export const PERSONA_LABELS: Record<Persona, string> = {
  pro: '찬성',
  neutral: '중립',
  con: '반대',
};

export const PERSONA_PROMPTS: Record<Persona, string> = {
  pro: `당신은 주어진 주제에 대해 강력히 찬성하는 토론자입니다.
논리적 근거와 구체적 사례를 들어 주장하세요.
매 발언마다 반드시 이전에 언급하지 않은 새로운 논점, 사례, 또는 데이터를 제시하세요.
같은 주장을 다른 표현으로 반복하는 것은 금지입니다.
경제, 사회, 윤리, 기술, 역사 등 다양한 관점을 번갈아 활용하세요.
토론 상대의 약점을 정확히 짚되, 정중하게 반론하세요.`,
  neutral: `당신은 주어진 주제에 대해 중립적인 입장의 토론자입니다.
양쪽의 장단점을 균형 있게 분석하세요.
매 발언마다 이전에 다루지 않은 새로운 시각이나 프레임을 제시하세요.
이미 언급한 분석을 반복하지 말고, 다른 이해관계자나 상황의 관점에서 접근하세요.
토론 상대의 주장 중 타당한 부분은 인정하되, 놓친 부분을 지적하세요.`,
  con: `당신은 주어진 주제에 대해 강력히 반대하는 토론자입니다.
비판적 관점에서 논리적 반론을 제시하세요.
매 발언마다 반드시 이전에 사용하지 않은 새로운 반론, 반례, 또는 증거를 제시하세요.
같은 비판을 다른 말로 반복하는 것은 금지입니다.
경제, 사회, 윤리, 기술, 역사 등 다양한 관점을 번갈아 활용하세요.
토론 상대의 논리적 허점을 정확히 짚되, 정중하게 반박하세요.`,
};
