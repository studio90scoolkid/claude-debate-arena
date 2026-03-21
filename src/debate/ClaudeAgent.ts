import { spawn, execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import { AIAgent, Persona, ClaudeModelAlias, AuthStatus, DebateMessage, DebateMode, TokenUsage } from './types';
import { PromptConfig, buildSystemPrompt, buildFirstTurnPrompt, buildFollowUpPrompt } from './promptBuilder';

const TIMEOUT_MS = 60_000;

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
  // Disable all non-essential telemetry, error reporting, and feedback surveys
  // See: https://code.claude.com/docs/en/data-usage
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
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
    public readonly allowConcession: boolean = true,
    public readonly mode: DebateMode = 'general',
    public readonly cwd?: string,
  ) {
    this.sessionId = randomUUID();
  }

  async respond(
    topic: string,
    history: DebateMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    // Derive turnCount from history length so retries don't double-increment
    this.turnCount = Math.floor(history.length / 2) + 1;
    this._topic = topic;
    const isFirstTurn = history.length === 0;
    const config = this.promptConfig;
    const prompt = isFirstTurn
      ? buildFirstTurnPrompt(config, topic)
      : buildFollowUpPrompt(config, topic, history);
    return this.callClaude(prompt, signal, isFirstTurn);
  }

  private get promptConfig(): PromptConfig {
    return {
      name: this.name,
      persona: this.persona,
      opponentName: this.opponentName,
      seekConsensus: this.seekConsensus,
      allowConcession: this.allowConcession,
      turnCount: this.turnCount,
      mode: this.mode,
    };
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
      if (this.mode === 'code') {
        args.push('--allowedTools', 'Read,Grep,Glob');
      }
      if (isFirstTurn) {
        // Create a new session with system prompt
        args.push('--session-id', this.sessionId);
        args.push('--system-prompt', buildSystemPrompt(this.promptConfig, this._topic));
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

      const spawnOpts: { stdio: ['ignore', 'pipe', 'pipe']; env: NodeJS.ProcessEnv; cwd?: string } = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      };
      if (this.mode === 'code' && this.cwd) {
        spawnOpts.cwd = this.cwd;
      }
      const proc = spawn(claudePath, args, spawnOpts);

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
