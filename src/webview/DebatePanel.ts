import * as vscode from 'vscode';
import { DebateManager } from '../debate/DebateManager';
import { checkClaudeAuth } from '../debate/ClaudeAgent';
import { checkGeminiAuth } from '../debate/GeminiAgent';
import { DebateMessage, DebateMode, ModelAlias, Persona, Provider, WebviewMessage } from '../debate/types';
import { getWebviewContent } from './getWebviewContent';

const SETTINGS_KEY = 'debate.lastSettings';
const CHAT_STATE_KEY = 'debate.chatState';

interface DebateSettings {
  nameA?: string;
  nameB?: string;
  personaA?: string;
  personaB?: string;
  charA?: string;
  charB?: string;
  providerA?: string;
  providerB?: string;
  modelA?: string;
  modelB?: string;
  topic?: string;
  mode?: string;
  seekConsensus?: string;
  showSummary?: string;
  allowConcession?: string;
}

export class DebatePanel {
  public static currentPanel: DebatePanel | undefined;
  public static readonly viewType = 'aiDebate';

  // Shared DebateManager survives panel disposal so running debates persist across window moves
  private static sharedDebateManager: DebateManager | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly context: vscode.ExtensionContext;
  private readonly debateManager: DebateManager;
  private disposed = false;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.context = context;

    // Reuse existing DebateManager if available (e.g. after window detach/reattach)
    if (DebatePanel.sharedDebateManager) {
      this.debateManager = DebatePanel.sharedDebateManager;
      // Clear old listeners from previous panel
      this.debateManager.removeAllListeners();
    } else {
      this.debateManager = new DebateManager();
      DebatePanel.sharedDebateManager = this.debateManager;
    }

    this.panel.webview.html = getWebviewContent(this.panel.webview, this.extensionUri, vscode.env.language);

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleWebviewMessage(message),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.debateManager.on('message', (msg: DebateMessage) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'newMessage', payload: msg });
        // Persist messages to disk so they survive extension restarts / window moves
        this.persistChatState();
      }
    });

    this.debateManager.on('thinking', (agent: string) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'thinking', payload: agent });
      }
    });

    this.debateManager.on('stateChange', (status: string) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'stateChange', payload: status });
        this.persistChatState();
      }
    });

    this.debateManager.on('error', (error: string) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'error', payload: error });
      }
    });

    this.debateManager.on('consensus', () => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'consensus', payload: null });
      }
    });

    this.debateManager.on('concession', (data: { conceder: string; winner: string }) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'concession', payload: data });
      }
    });

    this.debateManager.on('consensusGauge', (gauge: { scoreA: number; scoreB: number; average: number }) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'consensusGauge', payload: gauge });
      }
    });

    this.debateManager.on('summaryLoading', () => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'summaryLoading', payload: null });
      }
    });

    this.debateManager.on('summary', (text: string) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'summary', payload: text });
      }
    });

    // Auto-check connection when panel opens
    this.checkConnection();

    // Send saved settings to webview
    const saved = this.context.globalState.get<DebateSettings>(SETTINGS_KEY);
    if (saved) {
      this.panel.webview.postMessage({ type: 'loadSettings', payload: saved });
    }
  }

  public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void {
    const column = vscode.ViewColumn.One;

    if (DebatePanel.currentPanel) {
      DebatePanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DebatePanel.viewType,
      'Claude Talk',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );

    DebatePanel.currentPanel = new DebatePanel(panel, extensionUri, context);
  }

  public async stop(): Promise<void> {
    await this.debateManager.stop();
  }

  private async checkConnection(): Promise<void> {
    if (this.disposed) { return; }
    this.panel.webview.postMessage({
      type: 'connectionStatus',
      payload: { status: 'checking' },
    });

    // Check each provider independently so the UI can unlock as soon as the selected provider is ready
    const claudePromise = checkClaudeAuth().then((auth) => {
      if (this.disposed) { return; }
      this.panel.webview.postMessage({
        type: 'connectionStatus',
        payload: { status: 'providerReady', provider: 'claude', available: auth.loggedIn, email: auth.email, subscription: auth.subscriptionType, error: auth.error },
      });
      return auth;
    });

    const geminiPromise = checkGeminiAuth().then((auth) => {
      if (this.disposed) { return; }
      this.panel.webview.postMessage({
        type: 'connectionStatus',
        payload: { status: 'providerReady', provider: 'gemini', available: auth.loggedIn, installed: !!auth.installed, email: auth.email, error: auth.error },
      });
      return auth;
    });

    const [claudeAuth, geminiAuth] = await Promise.all([claudePromise, geminiPromise]);
    if (this.disposed || !claudeAuth || !geminiAuth) { return; }

    // Send final combined status for overall UI update
    this.panel.webview.postMessage({
      type: 'connectionStatus',
      payload: {
        status: (claudeAuth.loggedIn || geminiAuth.loggedIn) ? 'connected' : 'disconnected',
        claudeAvailable: claudeAuth.loggedIn,
        claudeEmail: claudeAuth.email,
        claudeSubscription: claudeAuth.subscriptionType,
        claudeError: claudeAuth.error,
        geminiAvailable: geminiAuth.loggedIn,
        geminiInstalled: !!geminiAuth.installed,
        geminiEmail: geminiAuth.email,
        geminiError: geminiAuth.error,
      },
    });
  }

  private handleWebviewMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'startDebate':
        if (message.topic) {
          const mode: DebateMode = message.mode || 'general';
          const workspaceRoot = mode === 'code'
            ? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            : undefined;
          if (mode === 'code' && !workspaceRoot) {
            this.panel.webview.postMessage({ type: 'error', payload: 'Code mode requires an open workspace folder.' });
            break;
          }
          // Clear persisted chat state for new debate
          this.context.globalState.update(CHAT_STATE_KEY, undefined);
          this.debateManager.startDebate(
            message.topic,
            (message.personaA as Persona) || 'pro',
            (message.personaB as Persona) || 'con',
            (message.modelA as ModelAlias) || 'sonnet',
            (message.modelB as ModelAlias) || 'sonnet',
            message.nameA || 'Agent A',
            message.nameB || 'Agent B',
            message.seekConsensus || false,
            (message.providerA as Provider) || 'claude',
            (message.providerB as Provider) || 'claude',
            message.showSummary !== false,
            message.allowConcession !== false,
            mode,
            workspaceRoot,
          );
        }
        break;
      case 'pauseDebate':
        this.debateManager.pause();
        break;
      case 'resumeDebate':
        this.debateManager.resume();
        break;
      case 'stopDebate':
        this.debateManager.stop();
        break;
      case 'checkConnection':
        this.checkConnection();
        break;
      case 'saveSettings':
        if (message.settings) {
          this.context.globalState.update(SETTINGS_KEY, message.settings);
        }
        break;
      case 'requestState': {
        // Re-send current debate state so the webview can restore after being recreated
        const debateState = this.debateManager.getState();
        const gauge = this.debateManager.getConsensusGauge();
        let messages = debateState.messages;
        let status = debateState.status;

        // If in-memory DebateManager has no messages, fall back to disk
        if (messages.length === 0) {
          const saved = this.context.globalState.get<{ status: string; messages: DebateMessage[] }>(CHAT_STATE_KEY);
          if (saved && saved.messages && saved.messages.length > 0) {
            messages = saved.messages;
            status = saved.status || 'stopped';
          }
        }

        this.panel.webview.postMessage({
          type: 'restoreState',
          payload: {
            status,
            messages,
            consensusGauge: gauge,
            currentTurn: debateState.currentTurn,
          },
        });
        // Also re-send saved settings
        const savedSettings = this.context.globalState.get<DebateSettings>(SETTINGS_KEY);
        if (savedSettings) {
          this.panel.webview.postMessage({ type: 'loadSettings', payload: savedSettings });
        }
        // Re-check connection
        this.checkConnection();
        break;
      }
    }
  }

  /** Save current debate messages to globalState so they survive extension restarts. */
  private persistChatState(): void {
    const state = this.debateManager.getState();
    // Only store essential fields to keep globalState lean
    const trimmed = state.messages.map(m => ({
      agent: m.agent,
      persona: m.persona,
      content: m.content,
      timestamp: m.timestamp,
    }));
    this.context.globalState.update(CHAT_STATE_KEY, {
      status: state.status,
      messages: trimmed,
    });
  }

  /** Fully stop the debate and destroy the shared manager (called on extension deactivate). */
  public static destroySharedManager(): void {
    if (DebatePanel.sharedDebateManager) {
      DebatePanel.sharedDebateManager.stop();
      DebatePanel.sharedDebateManager.removeAllListeners();
      DebatePanel.sharedDebateManager = undefined;
    }
  }

  /**
   * Revive a panel that was serialized (e.g. after window detach/reattach).
   * Called by the WebviewPanelSerializer registered in extension.ts.
   */
  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext): void {
    DebatePanel.currentPanel = new DebatePanel(panel, extensionUri, context);
  }

  private dispose(): void {
    if (this.disposed) { return; }
    this.disposed = true;
    DebatePanel.currentPanel = undefined;
    // Do NOT stop or destroy the shared DebateManager here — it may be reused after a revive.
    // Only remove listeners so the dead panel doesn't receive events.
    this.debateManager.removeAllListeners();

    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
