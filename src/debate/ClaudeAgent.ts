import { execSync } from 'child_process';
import { spawnCli } from './spawnCli';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as vscode from 'vscode';
import { AIAgent, Persona, ClaudeModelAlias, AuthStatus, DebateMessage, DebateMode, TokenUsage } from './types';
import { PromptConfig, buildSystemPrompt, buildFirstTurnPrompt, buildFollowUpPrompt } from './promptBuilder';

const TIMEOUT_MS = 60_000;
const IS_WINDOWS = process.platform === 'win32';

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
  if (IS_WINDOWS) {
    const npmGlobal = `${process.env.APPDATA}\\npm`;
    env.PATH = `${env.PATH};${npmGlobal}`;
  } else {
    const homeDir = os.homedir();
    env.PATH = `${env.PATH}:/usr/local/bin:/opt/homebrew/bin:${homeDir}/.local/bin`;
  }
  env.NONINTERACTIVE = '1';
  // Disable all non-essential telemetry, error reporting, and feedback surveys
  // See: https://code.claude.com/docs/en/data-usage
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  return env;
}

export function findClaudePath(): string {
  if (resolvedClaudePath) { return resolvedClaudePath; }

  const homeDir = os.homedir();
  const candidates = IS_WINDOWS
    ? [
        `${process.env.APPDATA}\\npm\\claude.cmd`,
        `${homeDir}\\.npm-global\\claude.cmd`,
        `${process.env.LOCALAPPDATA}\\npm\\claude.cmd`,
      ]
    : [
        `${homeDir}/.local/bin/claude`,
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        `${homeDir}/.nvm/versions/node/*/bin/claude`,
        `${homeDir}/.npm-global/bin/claude`,
      ];

  try {
    const whichCmd = IS_WINDOWS ? 'where claude' : 'which claude';
    const result = execSync(whichCmd, {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim().split(/\r?\n/)[0]; // 'where' on Windows may return multiple lines
    if (result) {
      resolvedClaudePath = result;
      getLog().appendLine(`[ClaudeAgent] Found claude at: ${result}`);
      return result;
    }
  } catch {
    // which/where failed, try candidates
  }

  // Try npm global prefix — VS Code extensions may not inherit shell PATH
  try {
    const npmPrefix = execSync('npm prefix -g', {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim();
    if (npmPrefix) {
      const binName = IS_WINDOWS ? 'claude.cmd' : 'claude';
      const npmBin = require('path').join(npmPrefix, IS_WINDOWS ? '' : 'bin', binName);
      const fs = require('fs');
      if (fs.existsSync(npmBin)) {
        resolvedClaudePath = npmBin;
        getLog().appendLine(`[ClaudeAgent] Found claude via npm prefix at: ${npmBin}`);
        return npmBin;
      }
    }
  } catch {
    // npm prefix failed
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
  resolvedClaudePath = IS_WINDOWS ? 'claude.cmd' : 'claude';
  return resolvedClaudePath;
}

/** Run a CLI command and capture output */
function runCliCommand(
  binPath: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const env = makeCleanEnv();
    const proc = spawnCli(binPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* */ }
      resolve({ code: null, stdout, stderr: stderr || 'timed out' });
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout: '', stderr: err.message });
    });
  });
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

  // Step 1: Verify CLI is actually callable
  const versionResult = await runCliCommand(claudePath, ['--version'], 10_000);
  log.appendLine(`[Auth] --version exit=${versionResult.code}, out=${versionResult.stdout.slice(0, 100)}`);

  if (versionResult.code !== 0 && !versionResult.stdout.trim()) {
    if (versionResult.stderr.includes('ENOENT')) {
      return { loggedIn: false, error: `Claude CLI not found at "${claudePath}". Install: npm install -g @anthropic-ai/claude-code` };
    }
    return { loggedIn: false, error: `Claude CLI error: ${versionResult.stderr.slice(0, 100)}` };
  }

  // Step 2: Try "auth status" for detailed info
  const authResult = await runCliCommand(claudePath, ['auth', 'status'], 15_000);
  log.appendLine(`[Auth] auth status exit=${authResult.code}, stdout=${authResult.stdout.slice(0, 300)}`);
  if (authResult.stderr) { log.appendLine(`[Auth] auth status stderr: ${authResult.stderr.slice(0, 300)}`); }

  const combined = authResult.stdout + '\n' + authResult.stderr;

  // Try JSON parse first
  try {
    const parsed = JSON.parse(authResult.stdout);
    if (parsed.loggedIn !== undefined) {
      return {
        loggedIn: !!parsed.loggedIn,
        authMethod: parsed.authMethod,
        email: parsed.email,
        orgName: parsed.orgName,
        subscriptionType: parsed.subscriptionType,
      };
    }
  } catch { /* not JSON */ }

  // Try text detection
  const lower = combined.toLowerCase();
  if (lower.includes('not logged in') || lower.includes('not authenticated')) {
    return { loggedIn: false, error: 'Not logged in. Run "claude login" in terminal.' };
  }
  if (lower.includes('logged in') || lower.includes('authenticated')) {
    log.appendLine('[Auth] Detected logged-in from text output');
    return { loggedIn: true };
  }

  // "auth status" returned exit 0 — assume logged in
  if (authResult.code === 0 && authResult.stdout.trim()) {
    log.appendLine(`[Auth] auth status exit 0, assuming logged in: ${authResult.stdout.slice(0, 200)}`);
    return { loggedIn: true };
  }

  // auth status returned unexpected result
  log.appendLine(`[Auth] auth status inconclusive: code=${authResult.code}, stdout=${authResult.stdout.slice(0, 200)}`);
  return { loggedIn: false, error: 'Could not determine auth status. Run "claude login" in terminal.' };
}

export class ClaudeAgent implements AIAgent {
  private sessionId: string;
  private sessionCreated = false;
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
    public readonly agentSlot?: 'A' | 'B',
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
    const isNewSession = !this.sessionCreated;
    const config = this.promptConfig;
    const prompt = history.length === 0
      ? buildFirstTurnPrompt(config, topic)
      : buildFollowUpPrompt(config, topic, history);
    return this.callClaude(prompt, signal, isNewSession);
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
      agentSlot: this.agentSlot,
    };
  }

  private callClaude(
    prompt: string,
    signal?: AbortSignal,
    isNewSession = false,
    _retryCount = 0,
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
      if (isNewSession) {
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
      const proc = spawnCli(claudePath, args, spawnOpts);

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
          // Session ID collision — regenerate and retry once
          if (isNewSession && stderr.includes('already in use') && _retryCount === 0) {
            this.sessionId = randomUUID();
            log.appendLine(`[${this.name}] Session ID conflict, retrying with ${this.sessionId}`);
            this.callClaude(prompt, signal, true, 1).then(safeResolve, safeReject);
            return;
          }
          safeReject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const result = parsed.result || parsed.content || stdout;
          const text = typeof result === 'string' ? result.trim() : JSON.stringify(result);
          log.appendLine(`[${this.name}] Response (${text.length} chars): ${text.slice(0, 100)}...`);
          this.sessionCreated = true;

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
            this.sessionCreated = true;
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
