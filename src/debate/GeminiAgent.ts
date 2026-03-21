import { spawn, execSync } from 'child_process';
import * as vscode from 'vscode';
import { AIAgent, Persona, GeminiModelAlias, DebateMessage, DebateMode, TokenUsage } from './types';
import { PromptConfig, buildSystemPrompt, buildFirstTurnPrompt, buildFollowUpPrompt } from './promptBuilder';

const TIMEOUT_MS = 60_000;

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
  // Disable telemetry and prompt logging
  // See: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md
  env.GEMINI_TELEMETRY_ENABLED = 'false';
  env.GEMINI_TELEMETRY_LOG_PROMPTS = 'false';
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
    public readonly allowConcession: boolean = true,
    public readonly mode: DebateMode = 'general',
    public readonly cwd?: string,
  ) {}

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
    let prompt = isFirstTurn
      ? this.buildGeminiFirstTurnPrompt(config, topic)
      : buildFollowUpPrompt(config, topic, history);
    if (!isFirstTurn) {
      prompt += `\n\nCRITICAL: Respond in the SAME language as "${topic}".`;
    }
    return this.callGemini(prompt, signal, isFirstTurn);
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

  /**
   * Gemini CLI has no --system-prompt flag, so we prepend system instructions
   * to the user prompt on the first turn.
   */
  private buildGeminiFirstTurnPrompt(config: PromptConfig, topic: string): string {
    const systemPrompt = buildSystemPrompt(config, topic);
    const taskPrompt = buildFirstTurnPrompt(config, topic);
    return `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n\n[YOUR TASK]\n${taskPrompt}\n\nCRITICAL LANGUAGE REMINDER: Detect the language of the topic "${topic}" and respond ENTIRELY in that language. If the topic is in English, respond in English. If in Korean, respond in Korean. Match the topic's language exactly.`;
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
      if (this.mode === 'code') {
        args.push('--sandbox');
      }
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

      const spawnOpts: { stdio: ['ignore', 'pipe', 'pipe']; env: NodeJS.ProcessEnv; cwd?: string } = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      };
      if (this.mode === 'code' && this.cwd) {
        spawnOpts.cwd = this.cwd;
      }
      const proc = spawn(geminiPath, args, spawnOpts);

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
