import { spawn, execSync } from 'child_process';
import * as vscode from 'vscode';
import { Persona, ModelAlias, AuthStatus, DebateMessage, TokenUsage, PERSONA_PROMPTS, PERSONA_LABELS } from './types';

const MAX_HISTORY_TURNS = 12;
const RECENT_FULL_TURNS = 4;
const MAX_MESSAGE_LENGTH = 500;
const SUMMARY_MESSAGE_LENGTH = 120;
const TIMEOUT_MS = 60_000;

let outputChannel: vscode.OutputChannel | undefined;

function getLog(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('AI Debate');
  }
  return outputChannel;
}

let resolvedClaudePath: string | null = null;

function makeCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_SESSION_ID;
  env.PATH = `${env.PATH}:/usr/local/bin:/opt/homebrew/bin`;
  env.NONINTERACTIVE = '1';
  return env;
}

function findClaudePath(): string {
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

export class ClaudeAgent {
  constructor(
    public readonly name: string,
    public readonly persona: Persona,
    public readonly model: ModelAlias = 'sonnet',
    public readonly opponentName: string = 'Agent B',
    public readonly seekConsensus: boolean = false,
  ) {}

  async respond(
    topic: string,
    history: DebateMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; usage?: TokenUsage }> {
    const prompt = this.buildPrompt(topic, history);
    return this.callClaude(prompt, signal);
  }

  private buildPrompt(topic: string, history: DebateMessage[]): string {
    const personaInstruction = PERSONA_PROMPTS[this.persona];
    const totalHistory = history.slice(-MAX_HISTORY_TURNS);
    const turnNumber = history.length + 1;

    let historyText = '';
    if (totalHistory.length > 0) {
      // Split into summarized older turns and recent full turns
      const recentCount = Math.min(RECENT_FULL_TURNS, totalHistory.length);
      const olderTurns = totalHistory.slice(0, -recentCount);
      const recentTurns = totalHistory.slice(-recentCount);

      // Determine which side this agent is: if last message is from B (or no history), we are A
      const iAmA = history.length === 0 || history[history.length - 1]?.agent === 'B';
      const nameForAgent = (agent: 'A' | 'B') => {
        if (iAmA) { return agent === 'A' ? this.name : this.opponentName; }
        return agent === 'B' ? this.name : this.opponentName;
      };

      if (olderTurns.length > 0) {
        historyText += '\n\n--- 이전 논점 요약 ---\n';
        for (const msg of olderTurns) {
          const label = nameForAgent(msg.agent);
          const firstSentence = msg.content.split(/[.!?。！？]\s*/)[0];
          const summary = firstSentence.length > SUMMARY_MESSAGE_LENGTH
            ? firstSentence.slice(0, SUMMARY_MESSAGE_LENGTH) + '...'
            : firstSentence;
          historyText += `[${label}]: ${summary}\n`;
        }
        historyText += '--- 요약 끝 ---\n';
      }

      historyText += '\n--- 최근 토론 ---\n';
      for (const msg of recentTurns) {
        const label = `${nameForAgent(msg.agent)} (${PERSONA_LABELS[msg.persona]})`;
        const content = msg.content.length > MAX_MESSAGE_LENGTH
          ? msg.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
          : msg.content;
        historyText += `[${label}]: ${content}\n\n`;
      }
      historyText += '--- 토론 끝 ---\n';
    }

    // Turn-aware strategy instruction
    let strategyHint = '';
    let consensusHint = '';

    if (this.seekConsensus) {
      // Consensus-seeking mode: gradually move toward agreement
      if (turnNumber <= 2) {
        strategyHint = '핵심 입장과 가장 강력한 근거를 제시하세요.';
        consensusHint = '';
      } else if (turnNumber <= 4) {
        strategyHint = '자신의 입장을 유지하면서도, 상대 주장 중 일부 타당한 점이 있다면 인정하세요.';
        consensusHint = '단, 아직 자신의 핵심 입장은 양보하지 마세요. 상대의 좋은 논점을 인정하는 정도로만 하세요.';
      } else if (turnNumber <= 6) {
        strategyHint = '상대 주장의 핵심 논거에 대해 부분적으로 동의하면서, 양측의 입장을 조율할 수 있는 접점을 탐색하세요.';
        consensusHint = '자신의 관점을 완전히 버리지 말되, "이 부분에서는 동의한다", "조건부로 수용할 수 있다" 같은 표현을 자연스럽게 사용하세요.';
      } else if (turnNumber <= 8) {
        strategyHint = '양측의 핵심 우려를 모두 반영한 절충안이나 통합적 해결책을 제안하세요.';
        consensusHint = '상대의 핵심 가치를 존중하면서 자신의 핵심 가치도 포함하는 방향으로 합의점을 구체적으로 제시하세요.';
      } else {
        strategyHint = '지금까지의 토론을 종합하여, 양측이 모두 수용할 수 있는 최종 합의안을 정리하세요.';
        consensusHint = '합의에 도달했다면 "[CONSENSUS_REACHED]"를 발언 끝에 포함하세요. 아직 차이가 있다면 남은 쟁점을 명확히 하고 타협점을 제시하세요.';
      }
    } else {
      // Original debate mode
      if (turnNumber <= 2) {
        strategyHint = '핵심 입장과 가장 강력한 근거를 제시하세요.';
      } else if (turnNumber <= 6) {
        strategyHint = '이전에 다루지 않은 새로운 근거, 데이터, 또는 사례를 반드시 포함하세요. 이미 언급한 논점을 반복하지 마세요.';
      } else if (turnNumber <= 12) {
        strategyHint = '지금까지와 완전히 다른 각도(경제적/사회적/윤리적/기술적/역사적 관점)에서 새로운 논점을 제시하세요. 기존 주장을 반복하면 안 됩니다.';
      } else {
        strategyHint = '상대방 논리의 전제 자체에 의문을 제기하거나, 양측이 놓친 제3의 관점을 제시하세요. 절대 이전 발언을 반복하지 마세요.';
      }
    }

    const actionLine = turnNumber === 1
      ? '첫 번째 발언으로 자신의 입장을 명확히 밝혀주세요.'
      : this.seekConsensus && turnNumber > 4
        ? `${this.opponentName}의 마지막 발언을 고려하여 합의점을 모색하며 답변하세요.`
        : `${this.opponentName}의 마지막 발언에 대해 반론하세요.`;

    return `${personaInstruction}

토론 주제: "${topic}"
${historyText}
당신은 ${this.name} (${PERSONA_LABELS[this.persona]}) 입장입니다. (현재 ${turnNumber}번째 발언)
${actionLine}

중요 지시사항:
- ${strategyHint}
${consensusHint ? `- ${consensusHint}\n` : ''}- 이전 요약에 나온 논점을 그대로 되풀이하지 마세요.
- 반드시 토론 주제가 작성된 언어와 동일한 언어로 답변하세요.
- 3~5문장으로 간결하게 답변하세요. 마크다운 형식을 사용하지 마세요.`;
  }

  private callClaude(prompt: string, signal?: AbortSignal): Promise<{ text: string; usage?: TokenUsage }> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const log = getLog();
      const claudePath = findClaudePath();
      const env = makeCleanEnv();

      const args = ['-p', prompt, '--output-format', 'json', '--model', this.model];
      log.appendLine(`[${this.name}] Calling claude (model=${this.model}, prompt length=${prompt.length})`);

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
