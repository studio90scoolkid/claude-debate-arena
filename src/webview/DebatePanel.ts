import * as vscode from 'vscode';
import { DebateManager } from '../debate/DebateManager';
import { checkClaudeAuth } from '../debate/ClaudeAgent';
import { DebateMessage, ModelAlias, Persona, WebviewMessage } from '../debate/types';
import { getWebviewContent } from './getWebviewContent';

const SETTINGS_KEY = 'debate.lastSettings';

interface DebateSettings {
  nameA?: string;
  nameB?: string;
  personaA?: string;
  personaB?: string;
  charA?: string;
  charB?: string;
  modelA?: string;
  modelB?: string;
  topic?: string;
}

export class DebatePanel {
  public static currentPanel: DebatePanel | undefined;
  private static readonly viewType = 'aiDebate';

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
    this.debateManager = new DebateManager();

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
      }
    });

    this.debateManager.on('error', (error: string) => {
      if (!this.disposed) {
        this.panel.webview.postMessage({ type: 'error', payload: error });
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
      'AI Debate Arena',
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

    const auth = await checkClaudeAuth();

    if (this.disposed) { return; }
    this.panel.webview.postMessage({
      type: 'connectionStatus',
      payload: {
        status: auth.loggedIn ? 'connected' : 'disconnected',
        email: auth.email,
        orgName: auth.orgName,
        subscriptionType: auth.subscriptionType,
        error: auth.error,
      },
    });
  }

  private handleWebviewMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'startDebate':
        if (message.topic) {
          this.debateManager.startDebate(
            message.topic,
            (message.personaA as Persona) || 'pro',
            (message.personaB as Persona) || 'con',
            (message.modelA as ModelAlias) || 'sonnet',
            (message.modelB as ModelAlias) || 'sonnet',
            message.nameA || 'Agent A',
            message.nameB || 'Agent B',
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
    }
  }

  private dispose(): void {
    if (this.disposed) { return; }
    this.disposed = true;
    DebatePanel.currentPanel = undefined;
    this.debateManager.stop();
    this.debateManager.removeAllListeners();

    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
