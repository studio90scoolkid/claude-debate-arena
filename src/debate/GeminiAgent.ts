import { spawn, execSync } from 'child_process';
import * as vscode from 'vscode';
import { AIAgent, Persona, GeminiModelAlias, DebateMessage, TokenUsage, PERSONA_PROMPTS, PERSONA_LABELS } from './types';

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

let resolvedGeminiPath: string | null = null;

function makeCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  env.PATH = `${env.PATH}:/usr/local/bin:/opt/homebrew/bin`;
  return env;
}

export function findGeminiPath(): string {
  if (resolvedGeminiPath) { return resolvedGeminiPath; }

  const candidates = [
    '/usr/local/bin/gemini',
    '/opt/homebrew/bin/gemini',
    `${process.env.HOME}/.nvm/versions/node/*/bin/gemini`,
    `${process.env.HOME}/.npm-global/bin/gemini`,
  ];

  try {
    const result = execSync('which gemini', {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim();
    if (result) {
      resolvedGeminiPath = result;
      getLog().appendLine(`[GeminiAgent] Found gemini at: ${result}`);
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
              resolvedGeminiPath = full;
              getLog().appendLine(`[GeminiAgent] Found gemini at: ${full}`);
              return full;
            }
          }
        }
      } catch { /* skip */ }
    } else if (fs.existsSync(candidate)) {
      resolvedGeminiPath = candidate;
      getLog().appendLine(`[GeminiAgent] Found gemini at: ${candidate}`);
      return candidate;
    }
  }

  getLog().appendLine('[GeminiAgent] WARNING: Could not resolve gemini path, using bare "gemini"');
  resolvedGeminiPath = 'gemini';
  return 'gemini';
}

/** Decode email from JWT id_token (no verification, just payload extraction) */
function extractEmailFromIdToken(idToken: string): string | undefined {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) { return undefined; }
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const data = JSON.parse(payload);
    return data.email;
  } catch {
    return undefined;
  }
}

/** Check Gemini CLI installation and authentication */
export async function checkGeminiAuth(): Promise<{ loggedIn: boolean; installed?: boolean; email?: string; error?: string }> {
  const log = getLog();
  let geminiPath: string;
  try {
    geminiPath = findGeminiPath();
  } catch {
    return { loggedIn: false, installed: false, error: 'Gemini CLI not found. Install: npm install -g @google/gemini-cli' };
  }

  const env = makeCleanEnv();

  // Step 1: Check installation via --version
  const installed = await new Promise<boolean>((resolve) => {
    const proc = spawn(geminiPath, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], env });
    const timeout = setTimeout(() => { try { proc.kill('SIGTERM'); } catch { /* */ } resolve(false); }, 10_000);
    proc.on('close', (code) => { clearTimeout(timeout); resolve(code === 0); });
    proc.on('error', () => { clearTimeout(timeout); resolve(false); });
  });

  if (!installed) {
    return { loggedIn: false, installed: false, error: 'Gemini CLI not found. Install: npm install -g @google/gemini-cli' };
  }

  // Step 2: Check auth by reading config file + env vars (no token cost)
  const fs = require('fs');
  const path = require('path');
  const homeDir = process.env.HOME || '';
  const settingsPath = path.join(homeDir, '.gemini', 'settings.json');

  // Check env vars first
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_VERTEXAI || process.env.GOOGLE_GENAI_USE_GCA) {
    log.appendLine('[GeminiAuth] Auth found via environment variable');
    return { loggedIn: true, installed: true };
  }

  // Check settings.json for auth type
  let authType: string | undefined;
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      authType = settings?.security?.auth?.selectedType
        || settings?.authType
        || settings?.apiKey;
    }
  } catch (e: unknown) {
    log.appendLine(`[GeminiAuth] Failed to read settings.json: ${e}`);
  }

  if (!authType) {
    log.appendLine('[GeminiAuth] No auth config found');
    return { loggedIn: false, installed: true, error: 'Gemini not authenticated. Run: gemini' };
  }

  // For OAuth auth, verify credentials file exists with a valid refresh_token
  if (String(authType).includes('oauth')) {
    const credsPath = path.join(homeDir, '.gemini', 'oauth_creds.json');
    try {
      if (fs.existsSync(credsPath)) {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        const email = creds.id_token ? extractEmailFromIdToken(creds.id_token) : undefined;
        if (creds.refresh_token) {
          log.appendLine('[GeminiAuth] OAuth credentials valid (refresh_token present)');
          return { loggedIn: true, installed: true, email };
        }
        // No refresh_token — check if access_token is still valid
        if (creds.access_token && creds.expiry_date && creds.expiry_date > Date.now()) {
          log.appendLine('[GeminiAuth] OAuth access_token still valid');
          return { loggedIn: true, installed: true, email };
        }
        log.appendLine('[GeminiAuth] OAuth credentials expired');
        return { loggedIn: false, installed: true, error: 'Gemini auth expired. Run: gemini' };
      }
    } catch (e: unknown) {
      log.appendLine(`[GeminiAuth] Failed to read oauth_creds.json: ${e}`);
    }
    log.appendLine('[GeminiAuth] OAuth configured but no credentials file');
    return { loggedIn: false, installed: true, error: 'Gemini not authenticated. Run: gemini' };
  }

  // Non-OAuth auth (API key in settings, etc.)
  log.appendLine(`[GeminiAuth] Auth found in settings.json: ${authType}`);
  return { loggedIn: true, installed: true };
}

export class GeminiAgent implements AIAgent {
  private sessionId: string | null = null;
  private turnCount = 0;
  private _topic = '';

  constructor(
    public readonly name: string,
    public readonly persona: Persona,
    public readonly model: GeminiModelAlias = 'gemini-2.5-flash',
    public readonly opponentName: string = 'Agent B',
    public readonly seekConsensus: boolean = false,
  ) {}

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
    return this.callGemini(prompt, signal, isFirstTurn);
  }

  /**
   * Gemini CLI has no --system-prompt flag, so we prepend system instructions
   * to the user prompt on the first turn.
   */
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

  private buildFirstTurnPrompt(topic: string): string {
    const systemPrompt = this.buildSystemPrompt(topic);
    return `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n\n[YOUR TASK]\n"${topic}" — state your position for the first time.\n\nYou are someone with a strong opinion on this. A friend brought up this topic, and you speak first. This is a conversation, not a speech.\n\nDo NOT:\n- Start with "I believe" or "I think" or any generic opener.\n- Quote famous people, cite studies, or use literary references.\n- Use poetic metaphors or dramatic setups.\n- End by addressing ${this.opponentName} with a rhetorical question.\n\nDO:\n- State your core claim directly. Get to the point from the first sentence.\n- Support it with one specific, everyday example that anyone can relate to.\n- End with a claim that makes ${this.opponentName} want to push back.`;
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

    let topicReminder = '';
    if (this.turnCount >= 4) {
      topicReminder = `\n\n[Topic check] The debate topic is "${topic}". Only discuss content directly related to this topic.`;
    }

    return `${debateProgress}

[${this.opponentName} just said]: ${opponentText}

${responseInstruction}

${strategyHint}${topicReminder}`;
  }

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

  private callGemini(
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
      const geminiPath = findGeminiPath();
      const env = makeCleanEnv();

      const args = ['-p', prompt, '--output-format', 'json', '-m', this.model];
      if (!isFirstTurn && this.sessionId) {
        // Resume existing session
        args.push('--resume', this.sessionId);
        log.appendLine(`[${this.name}] Resuming Gemini session ${this.sessionId} (turn=${this.turnCount})`);
      } else {
        log.appendLine(`[${this.name}] Starting new Gemini session (model=${this.model})`);
      }

      log.appendLine(`[${this.name}] Prompt length=${prompt.length}`);

      let settled = false;
      const safeResolve = (val: { text: string; usage?: TokenUsage }) => { if (!settled) { settled = true; resolve(val); } };
      const safeReject = (err: Error) => { if (!settled) { settled = true; reject(err); } };

      const proc = spawn(geminiPath, args, {
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
        safeReject(new Error('Gemini CLI timeout (60s). stderr: ' + stderr.slice(0, 200)));
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

        log.appendLine(`[${this.name}] Gemini process exited with code ${code}`);
        if (stderr) { log.appendLine(`[${this.name}] stderr: ${stderr.slice(0, 500)}`); }

        if (code !== 0) {
          safeReject(new Error(`Gemini CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);

          // Extract session ID from response for future --resume
          if (parsed.sessionId || parsed.session_id) {
            this.sessionId = parsed.sessionId || parsed.session_id;
            log.appendLine(`[${this.name}] Captured Gemini session ID: ${this.sessionId}`);
          }

          // Extract response text — try common Gemini JSON fields
          const result = parsed.response || parsed.result || parsed.content || parsed.text || stdout;
          const text = typeof result === 'string' ? result.trim() : JSON.stringify(result);
          log.appendLine(`[${this.name}] Response (${text.length} chars): ${text.slice(0, 100)}...`);

          // Extract token usage if available
          let usage: TokenUsage | undefined;
          const stats = parsed.usage || parsed.statistics || parsed.stats;
          if (stats) {
            usage = {
              inputTokens: stats.input_tokens || stats.inputTokens || stats.prompt_tokens || 0,
              outputTokens: stats.output_tokens || stats.outputTokens || stats.completion_tokens || stats.candidates_tokens || 0,
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
            safeReject(new Error(`Empty response from Gemini CLI. stderr: ${stderr.slice(0, 300)}`));
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        if (sigkillTimer) { clearTimeout(sigkillTimer); }
        signal?.removeEventListener('abort', onAbort);
        log.appendLine(`[${this.name}] Process error: ${err.message}`);
        if (err.message.includes('ENOENT')) {
          safeReject(new Error('Gemini CLI not found. Install: npm install -g @google/gemini-cli'));
        } else {
          safeReject(err);
        }
      });
    });
  }
}
