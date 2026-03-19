import { spawn, execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import { AIAgent, Persona, ClaudeModelAlias, AuthStatus, DebateMessage, TokenUsage, PERSONA_PROMPTS, PERSONA_LABELS } from './types';

const TIMEOUT_MS = 60_000;
const MAX_OPPONENT_MSG_LENGTH = 600;

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
      ? `\n- This is consensus-seeking mode. You genuinely want to find truth, not just win.
- Listen carefully to your opponent's arguments. If they make a valid point, acknowledge it honestly.
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

Your name is "${this.name}" and your stance is "${PERSONA_LABELS[this.persona]}".
Your opponent's name is "${this.opponentName}".

Debate topic: "${topic}"

Absolute rules:
- Every statement MUST be directly related to the debate topic "${topic}".
- Do not go off-topic with generalizations, unrelated examples, or tangential discussions.
- If you sense you are drifting off-topic, immediately return to the core issues of "${topic}".
- Each turn, present new arguments, cases, or evidence not used before.
- Repeating the same argument in different words is forbidden.
- You MUST respond in the SAME LANGUAGE as the debate topic. Detect the language of "${topic}" and use that language for your entire response.
- Keep your response to 3-5 sentences.
- NEVER use markdown formatting. No **, no *, no #, no -, no \`, no >. Absolutely zero markup characters. Plain text only. This is non-negotiable.${consensusRule}`;
  }

  /** First turn: introduce position */
  private buildFirstTurnPrompt(topic: string): string {
    return `Make your first statement on the debate topic "${topic}".
Present your core stance and strongest evidence.`;
  }

  /** Subsequent turns: respond to opponent's latest message with turn-aware strategy */
  private buildFollowUpPrompt(topic: string, history: DebateMessage[]): string {
    const lastMsg = history[history.length - 1];
    const opponentText = lastMsg.content.length > MAX_OPPONENT_MSG_LENGTH
      ? lastMsg.content.slice(0, MAX_OPPONENT_MSG_LENGTH) + '...'
      : lastMsg.content;

    const strategyHint = this.getStrategyHint();

    const actionLine = this.seekConsensus
      ? `Respond to the above statement honestly. Acknowledge what is valid, challenge what you disagree with.`
      : `Counter the above statement.`;

    // Topic anchor gets stronger as turns progress
    let topicReminder = '';
    if (this.turnCount >= 4) {
      topicReminder = `\n\n[Topic check] The debate topic is "${topic}". Only discuss content directly related to this topic.`;
    }

    return `[${this.opponentName}'s statement]: ${opponentText}

${actionLine}
Strategy: ${strategyHint}${topicReminder}`;
  }

  /** Turn-aware strategy hints */
  private getStrategyHint(): string {
    if (this.seekConsensus) {
      if (this.turnCount <= 1) {
        return 'Present your core stance and strongest evidence clearly.';
      } else if (this.turnCount <= 3) {
        return 'Engage with your opponent\'s specific arguments. Challenge weak points, but honestly acknowledge strong ones.';
      } else if (this.turnCount <= 5) {
        return 'Deepen the discussion. Introduce nuance, address edge cases, and refine your position based on the exchange so far.';
      } else if (this.turnCount <= 8) {
        return 'Focus on the remaining points of disagreement. If positions are converging, explore why. If not, clarify the core tension.';
      } else {
        return 'Synthesize the discussion. What has been established? What genuine disagreements remain? Be honest about where you stand now.';
      }
    } else {
      if (this.turnCount <= 1) {
        return 'Present your core stance and strongest evidence.';
      } else if (this.turnCount <= 3) {
        return 'Include new evidence, data, or examples not previously discussed.';
      } else if (this.turnCount <= 6) {
        return 'Argue from a completely different angle (economic/social/ethical/technical/historical).';
      } else {
        return 'Challenge the fundamental premises of your opponent\'s logic, or introduce a third perspective both sides have missed.';
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
