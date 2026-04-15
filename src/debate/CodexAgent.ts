import { execSync } from 'child_process';
import { spawnCli } from './spawnCli';
import * as os from 'os';
import * as vscode from 'vscode';
import { AIAgent, Persona, CodexModelAlias, DebateMessage, DebateMode, TokenUsage } from './types';
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

let resolvedCodexPath: string | null = null;

function makeCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (IS_WINDOWS) {
    const npmGlobal = `${process.env.APPDATA}\\npm`;
    env.PATH = `${env.PATH};${npmGlobal}`;
  } else {
    const homeDir = os.homedir();
    env.PATH = `${env.PATH}:/usr/local/bin:/opt/homebrew/bin:${homeDir}/.local/bin`;
  }
  return env;
}

export function findCodexPath(): string {
  if (resolvedCodexPath) { return resolvedCodexPath; }

  const homeDir = os.homedir();
  const candidates = IS_WINDOWS
    ? [
        `${process.env.APPDATA}\\npm\\codex.cmd`,
        `${homeDir}\\.npm-global\\codex.cmd`,
        `${process.env.LOCALAPPDATA}\\npm\\codex.cmd`,
      ]
    : [
        `${homeDir}/.local/bin/codex`,
        '/usr/local/bin/codex',
        '/opt/homebrew/bin/codex',
        `${homeDir}/.nvm/versions/node/*/bin/codex`,
        `${homeDir}/.npm-global/bin/codex`,
      ];

  try {
    const whichCmd = IS_WINDOWS ? 'where codex' : 'which codex';
    const result = execSync(whichCmd, {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim().split(/\r?\n/)[0];
    if (result) {
      resolvedCodexPath = result;
      getLog().appendLine(`[CodexAgent] Found codex at: ${result}`);
      return result;
    }
  } catch {
    // which/where failed, try candidates
  }

  // Try npm global prefix
  try {
    const npmPrefix = execSync('npm prefix -g', {
      encoding: 'utf8',
      timeout: 5000,
      env: makeCleanEnv(),
    }).trim();
    if (npmPrefix) {
      const binName = IS_WINDOWS ? 'codex.cmd' : 'codex';
      const npmBin = require('path').join(npmPrefix, IS_WINDOWS ? '' : 'bin', binName);
      const fs = require('fs');
      if (fs.existsSync(npmBin)) {
        resolvedCodexPath = npmBin;
        getLog().appendLine(`[CodexAgent] Found codex via npm prefix at: ${npmBin}`);
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
              resolvedCodexPath = full;
              getLog().appendLine(`[CodexAgent] Found codex at: ${full}`);
              return full;
            }
          }
        }
      } catch { /* skip */ }
    } else if (fs.existsSync(candidate)) {
      resolvedCodexPath = candidate;
      getLog().appendLine(`[CodexAgent] Found codex at: ${candidate}`);
      return candidate;
    }
  }

  getLog().appendLine('[CodexAgent] WARNING: Could not resolve codex path, using bare "codex"');
  resolvedCodexPath = IS_WINDOWS ? 'codex.cmd' : 'codex';
  return resolvedCodexPath;
}

/** Check Codex CLI installation and authentication */
export async function checkCodexAuth(): Promise<{ loggedIn: boolean; installed?: boolean; tier?: string; error?: string }> {
  const log = getLog();
  let codexPath: string;
  try {
    codexPath = findCodexPath();
  } catch {
    return { loggedIn: false, installed: false, error: 'Codex CLI not found. Install: npm install -g @openai/codex' };
  }

  const env = makeCleanEnv();

  // Step 1: Check installation via --version
  const installed = await new Promise<boolean>((resolve) => {
    const proc = spawnCli(codexPath, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], env });
    const timeout = setTimeout(() => { try { proc.kill('SIGTERM'); } catch { /* */ } resolve(false); }, 10_000);
    proc.on('close', (code) => { clearTimeout(timeout); resolve(code === 0); });
    proc.on('error', () => { clearTimeout(timeout); resolve(false); });
  });

  if (!installed) {
    return { loggedIn: false, installed: false, error: 'Codex CLI not found. Install: npm install -g @openai/codex' };
  }

  // Step 2: Check auth — OPENAI_API_KEY env var or codex login status
  if (process.env.OPENAI_API_KEY) {
    log.appendLine('[CodexAuth] Auth found via OPENAI_API_KEY env var');
    // API key users have full model access
    return { loggedIn: true, installed: true, tier: 'pro' };
  }

  // Check codex login status
  const authResult = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawnCli(codexPath, ['login', 'status'], { stdio: ['ignore', 'pipe', 'pipe'], env });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    const timeout = setTimeout(() => { try { proc.kill('SIGTERM'); } catch { /* */ } resolve({ code: null, stdout, stderr }); }, 10_000);
    proc.on('close', (code) => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    proc.on('error', (err) => { clearTimeout(timeout); resolve({ code: null, stdout: '', stderr: err.message }); });
  });

  log.appendLine(`[CodexAuth] login status exit=${authResult.code}, stdout=${authResult.stdout.slice(0, 300)}`);

  const combined = (authResult.stdout + '\n' + authResult.stderr).toLowerCase();

  // Check for explicit "not logged in" / "not authenticated" first
  if (combined.includes('not logged in') || combined.includes('not authenticated') || combined.includes('no api key') || combined.includes('unauthenticated')) {
    return { loggedIn: false, installed: true, error: 'Codex not authenticated. Run: codex login' };
  }

  // Only trust positive signals — exit code 0 alone is not sufficient
  if (combined.includes('logged in') || combined.includes('authenticated')) {
    // Try to detect plan from output (e.g. "plus", "pro", "enterprise")
    // Default to 'free' for ChatGPT-authenticated users since tier info is not reported
    let tier: string = 'free';
    if (combined.includes('pro')) { tier = 'pro'; }
    else if (combined.includes('plus')) { tier = 'plus'; }
    log.appendLine(`[CodexAuth] Detected tier: ${tier}`);
    return { loggedIn: true, installed: true, tier };
  }

  // Exit code 0 without explicit auth confirmation — assume not authenticated
  return { loggedIn: false, installed: true, error: 'Codex not authenticated. Run: codex login' };
}

export class CodexAgent implements AIAgent {
  private turnCount = 0;
  private _topic = '';

  constructor(
    public readonly name: string,
    public readonly persona: Persona,
    public readonly model: CodexModelAlias = 'gpt-5.4-mini',
    public readonly opponentName: string = 'Agent B',
    public readonly seekConsensus: boolean = false,
    public readonly allowConcession: boolean = true,
    public readonly mode: DebateMode = 'general',
    public readonly cwd?: string,
    public readonly agentSlot?: 'A' | 'B',
  ) {}

  async respond(
    topic: string,
    history: DebateMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    this.turnCount = Math.floor(history.length / 2) + 1;
    this._topic = topic;
    const isFirstTurn = history.length === 0;
    const config = this.promptConfig;
    let prompt = isFirstTurn
      ? this.buildCodexFirstTurnPrompt(config, topic)
      : buildFollowUpPrompt(config, topic, history);
    if (!isFirstTurn) {
      prompt += `\n\nCRITICAL: Respond in the SAME language as "${topic}".`;
    }
    return this.callCodex(prompt, signal);
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

  /**
   * Codex CLI `exec` has no --system-prompt flag, so we prepend system instructions
   * to the user prompt on the first turn.
   */
  private buildCodexFirstTurnPrompt(config: PromptConfig, topic: string): string {
    const systemPrompt = buildSystemPrompt(config, topic);
    const taskPrompt = buildFirstTurnPrompt(config, topic);
    return `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n\n[YOUR TASK]\n${taskPrompt}\n\nCRITICAL LANGUAGE REMINDER: Detect the language of the topic "${topic}" and respond ENTIRELY in that language. If the topic is in English, respond in English. If in Korean, respond in Korean. Match the topic's language exactly.`;
  }

  private callCodex(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const log = getLog();
      const codexPath = findCodexPath();
      const env = makeCleanEnv();

      // Use `codex exec` for non-interactive mode with --json output
      // Pass prompt via stdin (use '-' placeholder) to avoid ARG_MAX limits
      const args = ['exec', '-', '-m', this.model, '--json', '-s', 'danger-full-access'];

      log.appendLine(`[${this.name}] Starting Codex exec (model=${this.model})`);
      log.appendLine(`[${this.name}] Prompt length=${prompt.length}`);

      let settled = false;
      const safeResolve = (val: { text: string; usage?: TokenUsage }) => { if (!settled) { settled = true; resolve(val); } };
      const safeReject = (err: Error) => { if (!settled) { settled = true; reject(err); } };

      const spawnOpts: { stdio: ['pipe', 'pipe', 'pipe']; env: NodeJS.ProcessEnv; cwd?: string } = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      };
      if (this.mode === 'code' && this.cwd) {
        spawnOpts.cwd = this.cwd;
      }
      const proc = spawnCli(codexPath, args, spawnOpts);

      // Write prompt to stdin and close it
      proc.stdin.write(prompt);
      proc.stdin.end();

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
        safeReject(new Error('Codex CLI timeout (60s). stderr: ' + stderr.slice(0, 200)));
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

        log.appendLine(`[${this.name}] Codex process exited with code ${code}`);
        if (stderr) { log.appendLine(`[${this.name}] stderr: ${stderr.slice(0, 500)}`); }

        if (code !== 0) {
          // Codex CLI outputs errors as JSON to stdout, stderr may be empty
          let errorMsg = stderr.slice(0, 300);
          if (!errorMsg && stdout) {
            for (const line of stdout.trim().split('\n')) {
              try {
                const evt = JSON.parse(line);
                if (evt.type === 'error' && evt.message) {
                  try {
                    const inner = JSON.parse(evt.message);
                    errorMsg = inner.error?.message || evt.message;
                  } catch { errorMsg = evt.message; }
                  break;
                }
              } catch { /* skip */ }
            }
          }
          safeReject(new Error(`Codex CLI exited with code ${code}: ${errorMsg}`));
          return;
        }

        // Codex exec --json outputs newline-delimited JSON events.
        // Extract the last assistant message from the event stream.
        let text = '';
        let usage: TokenUsage | undefined;

        try {
          // Try parsing as a single JSON object first
          const parsed = JSON.parse(stdout);
          const result = parsed.response || parsed.result || parsed.content || parsed.text || parsed.message;
          if (result) {
            text = typeof result === 'string' ? result.trim() : JSON.stringify(result);
          }
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.input_tokens || parsed.usage.prompt_tokens || 0,
              outputTokens: parsed.usage.output_tokens || parsed.usage.completion_tokens || 0,
            };
          }
        } catch {
          // Try newline-delimited JSON (NDJSON) — extract last message event
          const lines = stdout.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const event = JSON.parse(lines[i]);
              if (event.type === 'turn.completed' && event.usage && !usage) {
                usage = {
                  inputTokens: event.usage.input_tokens || 0,
                  outputTokens: event.usage.output_tokens || 0,
                };
              }
              if (!text && event.type === 'item.completed' && event.item?.text) {
                text = event.item.text.trim();
              } else if (!text && event.type === 'message' && event.content) {
                text = typeof event.content === 'string' ? event.content.trim() : JSON.stringify(event.content);
              } else if (!text && (event.response || event.result || event.text)) {
                const r = event.response || event.result || event.text;
                text = typeof r === 'string' ? r.trim() : JSON.stringify(r);
              } else if (!text && event.content && Array.isArray(event.content)) {
                const textParts = event.content
                  .filter((c: { type: string }) => c.type === 'text')
                  .map((c: { text: string }) => c.text);
                if (textParts.length > 0) {
                  text = textParts.join('\n').trim();
                }
              }
              if (text && usage) { break; }
            } catch { /* skip non-JSON lines */ }
          }

          // If no structured content found, use raw output
          if (!text) {
            text = stdout.trim();
          }
        }

        if (text) {
          log.appendLine(`[${this.name}] Response (${text.length} chars): ${text.slice(0, 100)}...`);
          safeResolve({ text, usage });
        } else {
          log.appendLine(`[${this.name}] Empty response!`);
          safeReject(new Error(`Empty response from Codex CLI. stderr: ${stderr.slice(0, 300)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        if (sigkillTimer) { clearTimeout(sigkillTimer); }
        signal?.removeEventListener('abort', onAbort);
        log.appendLine(`[${this.name}] Process error: ${err.message}`);
        if (err.message.includes('ENOENT')) {
          safeReject(new Error('Codex CLI not found. Install: npm install -g @openai/codex'));
        } else {
          safeReject(err);
        }
      });
    });
  }
}
