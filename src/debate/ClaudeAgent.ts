import { spawn, execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import { AIAgent, Persona, ClaudeModelAlias, AuthStatus, DebateMessage, TokenUsage, PERSONA_PROMPTS, PERSONA_LABELS } from './types';

const TIMEOUT_MS = 60_000;
const MAX_OPPONENT_MSG_LENGTH = 1000;
const MAX_SUMMARY_PER_SIDE = 3;

let outputChannel: vscode.OutputChannel | undefined;

function getLog(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('AI Debate');
  }
  return outputChannel;
}

let resolvedClaudePath: string | null = null;

export function makeCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_SESSION_ID;
  env.PATH = `${env.PATH}:/usr/local/bin:/opt/homebrew/bin`;
  env.NONINTERACTIVE = '1';
  return env;
}

export function findClaudePath(): string {
  if (resolvedClaudePath) { return resolvedClaudePath; }

  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.nvm/versions/node/*/bin/claude`,
    `${process.env.HOME}/.npm-global/bin/claude`,
  ];

  try {
    const result = execSync('which claude', {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim();
    if (result) {
      resolvedClaudePath = result;
      getLog().appendLine(`[ClaudeAgent] Found claude at: ${result}`);
      return result;
    }
  } catch {
    // which failed, try candidates
  }

  const fs = require('fs');
  for (const candidate of candidates) {
    if (candidate.includes('*')) {
      try {
        const dir = candidate.substring(0, candidate.indexOf('*'));
        if (fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir);
          for (const entry of entries) {
            const full = candidate.replace('*', entry);
            if (fs.existsSync(full)) {
              resolvedClaudePath = full;
              getLog().appendLine(`[ClaudeAgent] Found claude at: ${full}`);
              return full;
            }
          }
        }
      } catch { /* skip */ }
    } else if (fs.existsSync(candidate)) {
      resolvedClaudePath = candidate;
      getLog().appendLine(`[ClaudeAgent] Found claude at: ${candidate}`);
      return candidate;
    }
  }

  getLog().appendLine('[ClaudeAgent] WARNING: Could not resolve claude path, using bare "claude"');
  resolvedClaudePath = 'claude';
  return 'claude';
}

/** Check Claude CLI installation and auth status */
export async function checkClaudeAuth(): Promise<AuthStatus> {
  const log = getLog();
  let claudePath: string;
  try {
    claudePath = findClaudePath();
  } catch {
    return { loggedIn: false, error: 'Claude CLI not found. Install: npm install -g @anthropic-ai/claude-code' };
  }

  return new Promise((resolve) => {
    const env = makeCleanEnv();
    const proc = spawn(claudePath, ['auth', 'status'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timeout = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* */ }
      resolve({ loggedIn: false, error: 'Auth check timed out' });
    }, 15_000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      log.appendLine(`[Auth] exit code=${code}, stdout=${stdout.slice(0, 300)}`);
      if (stderr) { log.appendLine(`[Auth] stderr: ${stderr.slice(0, 300)}`); }

      try {
        const parsed = JSON.parse(stdout);
        resolve({
          loggedIn: !!parsed.loggedIn,
          authMethod: parsed.authMethod,
          email: parsed.email,
          orgName: parsed.orgName,
          subscriptionType: parsed.subscriptionType,
        });
      } catch {
        // Non-JSON output - likely not logged in or old CLI version
        if (stdout.includes('not logged in') || code !== 0) {
          resolve({ loggedIn: false, error: 'Not logged in. Run "claude auth login" in terminal.' });
        } else {
          resolve({ loggedIn: false, error: `Unexpected auth response: ${stdout.slice(0, 100)}` });
        }
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      log.appendLine(`[Auth] Process error: ${err.message}`);
      if (err.message.includes('ENOENT')) {
        resolve({ loggedIn: false, error: `Claude CLI not found at "${claudePath}". Install: npm install -g @anthropic-ai/claude-code` });
      } else {
        resolve({ loggedIn: false, error: err.message });
      }
    });
  });
}

export class ClaudeAgent implements AIAgent {
  private sessionId: string;
  private turnCount = 0;
  private _topic = '';

  constructor(
    public readonly name: string,
    public readonly persona: Persona,
    public readonly model: ClaudeModelAlias = 'sonnet',
    public readonly opponentName: string = 'Agent B',
    public readonly seekConsensus: boolean = false,
  ) {
    this.sessionId = randomUUID();
  }

  async respond(
    topic: string,
    history: DebateMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    this.turnCount++;
    this._topic = topic;
    const isFirstTurn = this.turnCount === 1;
    const prompt = isFirstTurn
      ? this.buildFirstTurnPrompt(topic)
      : this.buildFollowUpPrompt(topic, history);
    return this.callClaude(prompt, signal, isFirstTurn);
  }

  /** System prompt: persistent persona + topic anchoring for the entire session */
  private buildSystemPrompt(topic: string): string {
    const personaInstruction = PERSONA_PROMPTS[this.persona];
    const consensusRule = this.seekConsensus
      ? `\n\nConsensus-seeking mode:
- You genuinely want to find truth, not just win.
- Listen carefully to ${this.opponentName}'s arguments. If they make a valid point, acknowledge it honestly.
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

    return `${personaInstruction}

The debate: "${topic}"
You are "${this.name}". Your opponent is "${this.opponentName}".

Ground rules:
- Write in the language of the topic. This debate is in whatever language "${topic}" is written in.
- 3-5 sentences max. Aim for about 60-80 words total. Every sentence must earn its place.
- Plain text only. No markdown, no asterisks, no formatting of any kind. Just words.
- Never repeat an argument you already made, even reworded. Move forward.
- Address what your opponent actually said, not a strawman version of it.
- CRITICAL: You must defend your assigned stance throughout the debate. You may acknowledge a good point briefly, but always counter it and return to your position. Never concede your core position. A debate where both sides agree is a failed debate.

Voice and style:
- You are having a heated conversation with a friend, not writing a column or giving a speech.
- Short, punchy sentences. Say what you mean and stop.
- Use everyday examples from real life. Concrete beats abstract.
- Show personality through strong opinions, not literary performance.
- When you land a strong point, trust it. Do not explain it to death.
- Do NOT praise your opponent excessively. Flattery kills tension.
- Do NOT open with quotes, literary references, or research citations.
- Do NOT end by addressing your opponent by name with a rhetorical question.

Language-specific tone (STRICTLY ENFORCED):
Match the casual spoken register of the topic's language. You must sound like someone actually talking, not someone writing.

If Korean:
- USE casual/conversational endings: ~거든, ~잖아, ~는 거야, ~지, ~는데, ~다고, ~걸, ~야, ~죠, ~네
- NEVER use written/literary endings: ~한다, ~이다, ~것이다, ~할 수 있다, ~되었다, ~하였다, ~해야 한다
- Good: "솔직히 그건 좀 아닌 것 같거든" / Bad: "그것은 적절하지 않다"

If Japanese:
- USE casual spoken forms: ~だよ, ~じゃん, ~でしょ, ~よね, ~んだけど, ~じゃない?, ~って
- NEVER use written forms: ~である, ~ではないか, ~と考えられる, ~と言えよう
- Good: "それってさ、結局みんな困るだけじゃん" / Bad: "それは結局全員が困窮する結果となるのである"

If Chinese:
- USE spoken markers: 你想想, 说实话, 对吧, 其实, 哪有, 不就是, 你看
- NEVER use essay phrases: 综上所述, 由此可见, 不可否认, 值得注意的是
- Good: "你想想看，这事儿哪有那么简单" / Bad: "此事并非表面上看来那般简单"

If English:
- USE contractions (don't, it's, that's), casual phrasing, sentence fragments
- NEVER use hedging: "It could reasonably be argued", "One might consider"
- Good: "That's not how it works and you know it" / Bad: "It could be argued that this is not necessarily the case"

For any other language: match the register of a smart friend debating over coffee, not a columnist writing an op-ed.

Punctuation rule (strictly enforced):
The em-dash character is BANNED. You must not write the character "\u2014" anywhere in your response. Not even once. Use a period and start a new sentence instead. Example of what NOT to do: "낡은 가방, 오래된 인형 \u2014 이런 건 안 된다" Example of correct alternative: "낡은 가방, 오래된 인형. 이런 건 안 된다."${consensusRule}`;
  }

  /** First turn: introduce position */
  private buildFirstTurnPrompt(topic: string): string {
    return `"${topic}" — state your position for the first time.

You are someone with a strong opinion on this. A friend brought up this topic, and you speak first. This is a conversation, not a speech.

Do NOT:
- Start with "I believe" or "I think" or any generic opener.
- Quote famous people, cite studies, or use literary references.
- Use poetic metaphors or dramatic setups.
- End by addressing ${this.opponentName} with a rhetorical question.

DO:
- State your core claim directly. Get to the point from the first sentence.
- Support it with one specific, everyday example that anyone can relate to.
- End with a claim that makes ${this.opponentName} want to push back.`;
  }

  /** Build a compact summary of arguments so far from both sides */
  private buildDebateProgress(history: DebateMessage[]): string {
    if (history.length <= 1) { return ''; }

    const myMsgs = history.filter(m => m.agent === (this.persona === 'pro' || this.persona === 'neutral' ? 'A' : 'B'));
    const opMsgs = history.filter(m => m.agent !== (this.persona === 'pro' || this.persona === 'neutral' ? 'A' : 'B'));

    const summarize = (msgs: DebateMessage[], limit: number) =>
      msgs.slice(-limit).map((m, i) => `  - ${m.content.slice(0, 120)}`).join('\n');

    const parts: string[] = ['[What has been said so far]'];
    if (myMsgs.length > 0) {
      parts.push(`Your key points:\n${summarize(myMsgs, MAX_SUMMARY_PER_SIDE)}`);
    }
    if (opMsgs.length > 0) {
      parts.push(`${this.opponentName}'s key points:\n${summarize(opMsgs, MAX_SUMMARY_PER_SIDE)}`);
    }
    parts.push('You both already said all of this. Repeating it adds nothing. Push into new territory.');
    return parts.join('\n');
  }

  /** Subsequent turns: respond to opponent's latest message with turn-aware strategy */
  private buildFollowUpPrompt(topic: string, history: DebateMessage[]): string {
    const lastMsg = history[history.length - 1];
    const opponentText = lastMsg.content.length > MAX_OPPONENT_MSG_LENGTH
      ? lastMsg.content.slice(0, MAX_OPPONENT_MSG_LENGTH) + '...'
      : lastMsg.content;

    const strategyHint = this.getStrategyHint();
    const debateProgress = this.buildDebateProgress(history);

    const responseInstruction = this.seekConsensus
      ? `Respond to ${this.opponentName}:
- First, deal with what they actually said. If they scored a point, acknowledge it, then counter. If they missed something, show them.
- Then, bring something new that moves toward common ground — a reframing, a shared concern, a distinction that resolves the tension.
- 3-5 sentences max. Make every word count.`
      : `Respond to ${this.opponentName}:
- First, deal with what they actually said. Do not dodge. If they scored a point, say so, then counter. If they missed something, show them.
- Then, bring something new. A fact, a story, an analogy, a question that changes the frame. Something that makes ${this.opponentName} pause.
- 3-5 sentences max. Make every word count.
- REMINDER: No em-dashes (—). Use periods instead.`;

    // Topic anchor gets stronger as turns progress
    let topicReminder = '';
    if (this.turnCount >= 4) {
      topicReminder = `\n\n[Topic check] The debate topic is "${topic}". Only discuss content directly related to this topic.`;
    }

    return `${debateProgress}

[${this.opponentName} just said]: ${opponentText}

${responseInstruction}

${strategyHint}${topicReminder}`;
  }

  /** Turn-aware strategy hints */
  private getStrategyHint(): string {
    if (this.seekConsensus) {
      if (this.turnCount <= 1) {
        return `You are still establishing your position. Present your strongest case clearly and with conviction.`;
      } else if (this.turnCount <= 3) {
        return `Engage with ${this.opponentName}'s specific arguments. Challenge weak points, but honestly acknowledge strong ones. Show you are listening.`;
      } else if (this.turnCount <= 5) {
        return `The obvious moves are spent. Go deeper, not wider. Find the nuance that both sides have been circling around.`;
      } else if (this.turnCount <= 8) {
        return `Positions may be converging. Name what you now agree on and what genuinely remains unresolved. Be honest about where you have shifted.`;
      } else {
        return `Wrap it up. What has this exchange actually clarified? State where you landed honestly.`;
      }
    } else {
      if (this.turnCount <= 1) {
        return `You are still establishing your position. Back up your claim with something concrete.`;
      } else if (this.turnCount <= 3) {
        return `React naturally. If something ${this.opponentName} said surprised you, show it. If they dodged a point, call it out directly.`;
      } else if (this.turnCount <= 5) {
        return `The obvious arguments are spent. Find an angle nobody has touched yet.`;
      } else if (this.turnCount <= 7) {
        return `${this.opponentName} has patterns now. Name one. Then shift your own approach.`;
      } else {
        return `Wrap it up. Zoom out. What has this debate actually changed about how you see the issue?`;
      }
    }
  }

  private callClaude(
    prompt: string,
    signal?: AbortSignal,
    isFirstTurn = false,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const log = getLog();
      const claudePath = findClaudePath();
      const env = makeCleanEnv();

      const args = ['-p', prompt, '--output-format', 'json', '--model', this.model];
      if (isFirstTurn) {
        // Create a new session with system prompt
        args.push('--session-id', this.sessionId);
        args.push('--system-prompt', this.buildSystemPrompt(this._topic));
        log.appendLine(`[${this.name}] Creating session ${this.sessionId} (model=${this.model})`);
      } else {
        // Resume existing session — Claude remembers full context
        args.push('--resume', this.sessionId);
        log.appendLine(`[${this.name}] Resuming session ${this.sessionId} (turn=${this.turnCount})`);
      }

      log.appendLine(`[${this.name}] Prompt length=${prompt.length}`);

      let settled = false;
      const safeResolve = (val: { text: string; usage?: TokenUsage }) => { if (!settled) { settled = true; resolve(val); } };
      const safeReject = (err: Error) => { if (!settled) { settled = true; reject(err); } };

      const proc = spawn(claudePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });

      let stdout = '';
      let stderr = '';
      let sigkillTimer: NodeJS.Timeout | null = null;

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      const killProc = () => {
        try { proc.kill('SIGTERM'); } catch { /* already dead */ }
        sigkillTimer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* already dead */ }
        }, 2000);
      };

      const timeout = setTimeout(() => {
        log.appendLine(`[${this.name}] TIMEOUT after ${TIMEOUT_MS}ms`);
        killProc();
        safeReject(new Error('Claude CLI timeout (60s). stderr: ' + stderr.slice(0, 200)));
      }, TIMEOUT_MS);

      const onAbort = () => {
        log.appendLine(`[${this.name}] Aborted`);
        killProc();
        safeReject(new Error('Aborted'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (sigkillTimer) { clearTimeout(sigkillTimer); }
        signal?.removeEventListener('abort', onAbort);

        log.appendLine(`[${this.name}] Process exited with code ${code}`);
        if (stderr) { log.appendLine(`[${this.name}] stderr: ${stderr.slice(0, 500)}`); }

        if (code !== 0) {
          safeReject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const result = parsed.result || parsed.content || stdout;
          const text = typeof result === 'string' ? result.trim() : JSON.stringify(result);
          log.appendLine(`[${this.name}] Response (${text.length} chars): ${text.slice(0, 100)}...`);

          // Extract token usage if available
          let usage: TokenUsage | undefined;
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.input_tokens || 0,
              outputTokens: parsed.usage.output_tokens || 0,
            };
            log.appendLine(`[${this.name}] Tokens: in=${usage.inputTokens}, out=${usage.outputTokens}`);
          }

          safeResolve({ text, usage });
        } catch {
          const text = stdout.trim();
          if (text) {
            log.appendLine(`[${this.name}] Non-JSON response (${text.length} chars)`);
            safeResolve({ text });
          } else {
            log.appendLine(`[${this.name}] Empty response!`);
            safeReject(new Error(`Empty response from Claude CLI. stderr: ${stderr.slice(0, 300)}`));
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        if (sigkillTimer) { clearTimeout(sigkillTimer); }
        signal?.removeEventListener('abort', onAbort);
        log.appendLine(`[${this.name}] Process error: ${err.message}`);
        if (err.message.includes('ENOENT')) {
          safeReject(new Error(`Claude CLI not found at "${claudePath}". Install: npm install -g @anthropic-ai/claude-code`));
        } else {
          safeReject(err);
        }
      });
    });
  }
}
