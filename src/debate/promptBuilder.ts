import { DebateMessage, DebateMode, Persona, PERSONA_PROMPTS } from './types';

const MAX_OPPONENT_MSG_LENGTH = 1000;
const MAX_SUMMARY_PER_SIDE = 3;

export interface PromptConfig {
  name: string;
  persona: Persona;
  opponentName: string;
  seekConsensus: boolean;
  allowConcession: boolean;
  turnCount: number;
  mode?: DebateMode;
}

/** System prompt: persistent persona + topic anchoring for the entire session */
export function buildSystemPrompt(config: PromptConfig, topic: string): string {
  const { opponentName, seekConsensus, allowConcession, name } = config;
  const personaInstruction = PERSONA_PROMPTS[config.persona];
  const consensusRule = seekConsensus
    ? `\n\nConsensus-seeking mode:
- You genuinely want to find truth, not just win.
- Listen carefully to ${opponentName}'s arguments. If they make a valid point, acknowledge it honestly.
- Do NOT rush to agree. Defend your position firmly when you believe you are right.
- Only shift your stance when genuinely persuaded by evidence or logic, not just to be agreeable.
- At the end of every response, rate how much you agree with your opponent on a scale of 0-100 using this exact format: [CONSENSUS:XX] (e.g., [CONSENSUS:25])
  - 0-20: Strongly disagree, fundamental differences remain
  - 21-40: Some valid points acknowledged, but core disagreement persists
  - 41-60: Significant common ground found, but key differences remain
  - 61-80: Mostly aligned, working out remaining details
  - 81-100: Full agreement reached on core issues
- When you genuinely believe both sides have reached agreement (score 85+), include "[CONSENSUS_REACHED]" at the end.`
    : '';

  const concessionRule = allowConcession
    ? `\n\nConcession rule:
- If you genuinely cannot counter ${opponentName}'s argument and feel you have lost, you may concede.
- Only concede when you truly have no valid counterargument left. Do NOT concede just to be polite or to end the debate early.
- To concede, include "[CONCEDE]" at the very end of your response.
- Before the marker, honestly explain why you are conceding. What argument convinced you?`
    : '';

  return `${personaInstruction}

The debate: "${topic}"
You are "${name}". Your opponent is "${opponentName}".

Ground rules:
- Write in the language of the topic. This debate is in whatever language "${topic}" is written in.
- 3-5 sentences max. Aim for about 60-80 words total. Every sentence must earn its place.
- Plain text only. No markdown, no asterisks, no formatting of any kind. Just words.
- Never repeat an argument you already made, even reworded. Move forward.
- Address what your opponent actually said, not a strawman version of it.
- ${allowConcession
      ? 'Defend your assigned stance firmly throughout the debate. You may acknowledge a good point briefly, but always counter it and return to your position. Only concede if you truly have no counterargument left.'
      : 'CRITICAL: You must defend your assigned stance throughout the debate. You may acknowledge a good point briefly, but always counter it and return to your position. Never concede your core position. A debate where both sides agree is a failed debate.'}

Voice and style:
- You are having a heated conversation with a friend, not writing a column or giving a speech.
- Short, punchy sentences. Say what you mean and stop.
- Use everyday examples from real life. Concrete beats abstract.
- Show personality through strong opinions, not literary performance.
- When you land a strong point, trust it. Do not explain it to death.
- Do NOT praise your opponent excessively. Flattery kills tension.
- Do NOT open with quotes, literary references, or research citations.
- Do NOT end by addressing your opponent by name with a rhetorical question.

Tone (STRICTLY ENFORCED):
- Sound like a smart friend talking, not an essayist writing. Use the casual spoken register of the topic's language.
- Use colloquial contractions, fillers, and sentence fragments natural to that language. Avoid formal, literary, or academic phrasing.
- If you catch yourself sounding like a newspaper column, rewrite it as something you would actually say out loud.

Punctuation rule (strictly enforced):
The em-dash character is BANNED. You must not write the character "\u2014" anywhere in your response. Not even once. Use a period and start a new sentence instead. Example of what NOT to do: "old bags, old dolls \u2014 these won't do" Example of correct alternative: "Old bags, old dolls. These won't do."${consensusRule}${concessionRule}${config.mode === 'code' ? `

Code analysis mode:
- You have access to the codebase in your working directory. Use your file-reading tools (Read, Grep, Glob) to explore and reference actual code.
- Ground your arguments in real code: file paths, function names, patterns you find.
- When making a technical claim, back it up with evidence from the codebase.
- Quote short code snippets (under 5 lines) when they strengthen your point.
- If the topic is about architecture, patterns, or quality, explore the relevant files before arguing.` : ''}`;
}

/** First turn: introduce position */
export function buildFirstTurnPrompt(config: PromptConfig, topic: string): string {
  return `"${topic}" — state your position for the first time.

LANGUAGE RULE (CRITICAL): Your ENTIRE response must be in the SAME language as the topic "${topic}". Detect its language and use ONLY that language. Do NOT respond in English unless the topic is in English.

You are someone with a strong opinion on this. A friend brought up this topic, and you speak first. This is a conversation, not a speech.

Do NOT:
- Start with "I believe" or "I think" or any generic opener.
- Quote famous people, cite studies, or use literary references.
- Use poetic metaphors or dramatic setups.
- End by addressing ${config.opponentName} with a rhetorical question.

DO:
- State your core claim directly. Get to the point from the first sentence.
- Support it with one specific, everyday example that anyone can relate to.
- End with a claim that makes ${config.opponentName} want to push back.${config.mode === 'code' ? `

CODE MODE: Before stating your position, explore the codebase to find relevant files and patterns. Reference actual code (file paths, function names) in your argument.` : ''}`;
}

/** Build a compact summary of arguments so far from both sides */
export function buildDebateProgress(config: PromptConfig, history: DebateMessage[]): string {
  if (history.length <= 1) { return ''; }

  const myAgent = config.persona === 'pro' || config.persona === 'neutral' ? 'A' : 'B';
  const myMsgs = history.filter(m => m.agent === myAgent);
  const opMsgs = history.filter(m => m.agent !== myAgent);

  const summarize = (msgs: DebateMessage[], limit: number) =>
    msgs.slice(-limit).map(m => `  - ${m.content.slice(0, 120)}`).join('\n');

  const parts: string[] = ['[What has been said so far]'];
  if (myMsgs.length > 0) {
    parts.push(`Your key points:\n${summarize(myMsgs, MAX_SUMMARY_PER_SIDE)}`);
  }
  if (opMsgs.length > 0) {
    parts.push(`${config.opponentName}'s key points:\n${summarize(opMsgs, MAX_SUMMARY_PER_SIDE)}`);
  }
  parts.push('You both already said all of this. Repeating it adds nothing. Push into new territory.');
  return parts.join('\n');
}

/** Subsequent turns: respond to opponent's latest message with turn-aware strategy */
export function buildFollowUpPrompt(config: PromptConfig, topic: string, history: DebateMessage[]): string {
  const lastMsg = history[history.length - 1];
  const opponentText = lastMsg.content.length > MAX_OPPONENT_MSG_LENGTH
    ? lastMsg.content.slice(0, MAX_OPPONENT_MSG_LENGTH) + '...'
    : lastMsg.content;

  const strategyHint = getStrategyHint(config);
  const debateProgress = buildDebateProgress(config, history);

  const responseInstruction = config.seekConsensus
    ? `Respond to ${config.opponentName}:
- First, deal with what they actually said. If they scored a point, acknowledge it, then counter. If they missed something, show them.
- Then, bring something new that moves toward common ground — a reframing, a shared concern, a distinction that resolves the tension.
- 3-5 sentences max. Make every word count.`
    : `Respond to ${config.opponentName}:
- First, deal with what they actually said. Do not dodge. If they scored a point, say so, then counter. If they missed something, show them.
- Then, bring something new. A fact, a story, an analogy, a question that changes the frame. Something that makes ${config.opponentName} pause.
- 3-5 sentences max. Make every word count.
- REMINDER: No em-dashes (—). Use periods instead.`;

  // Topic anchor gets stronger as turns progress
  let topicReminder = '';
  if (config.turnCount >= 4) {
    topicReminder = `\n\n[Topic check] The debate topic is "${topic}". Only discuss content directly related to this topic.`;
  }

  const langRule = `LANGUAGE RULE: Respond in the SAME language as the topic "${topic}". Not English unless the topic is English.`;

  return `${debateProgress}

[${config.opponentName} just said]: ${opponentText}

${responseInstruction}

${strategyHint}
${langRule}${topicReminder}`;
}

/** Turn-aware strategy hints */
export function getStrategyHint(config: PromptConfig): string {
  const { turnCount, opponentName, seekConsensus, allowConcession } = config;
  const concedeReminder = allowConcession && turnCount >= 6
    ? ` If you honestly have no counterargument left, concede by including "[CONCEDE]" at the end.`
    : '';
  if (seekConsensus) {
    if (turnCount <= 1) {
      return `You are still establishing your position. Present your strongest case clearly and with conviction.`;
    } else if (turnCount <= 3) {
      return `Engage with ${opponentName}'s specific arguments. Challenge weak points, but honestly acknowledge strong ones. Show you are listening.`;
    } else if (turnCount <= 5) {
      return `The obvious moves are spent. Go deeper, not wider. Find the nuance that both sides have been circling around.`;
    } else if (turnCount <= 8) {
      return `Positions may be converging. Name what you now agree on and what genuinely remains unresolved. Be honest about where you have shifted.${concedeReminder}`;
    } else {
      return `This debate has gone on long enough. Either find final agreement or honestly admit defeat.${concedeReminder}`;
    }
  } else {
    if (turnCount <= 1) {
      return `You are still establishing your position. Back up your claim with something concrete.`;
    } else if (turnCount <= 3) {
      return `React naturally. If something ${opponentName} said surprised you, show it. If they dodged a point, call it out directly.`;
    } else if (turnCount <= 5) {
      return `The obvious arguments are spent. Find an angle nobody has touched yet.`;
    } else if (turnCount <= 7) {
      return `${opponentName} has patterns now. Name one. Then shift your own approach.${concedeReminder}`;
    } else {
      return `This debate has gone on long enough. Make your final point or admit defeat if you have nothing new.${concedeReminder}`;
    }
  }
}
