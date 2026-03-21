import * as vscode from 'vscode';
import { DebatePanel } from './webview/DebatePanel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('debate.start', () => {
      DebatePanel.createOrShow(context.extensionUri, context);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('debate.stop', async () => {
      if (DebatePanel.currentPanel) {
        await DebatePanel.currentPanel.stop();
      }
    }),
  );

  // Register serializer so the webview can be restored after window detach/reattach
  vscode.window.registerWebviewPanelSerializer(DebatePanel.viewType, {
    async deserializeWebviewPanel(panel: vscode.WebviewPanel, _state: unknown) {
      DebatePanel.revive(panel, context.extensionUri, context);
    },
  });
}

export async function deactivate() {
  if (DebatePanel.currentPanel) {
    await DebatePanel.currentPanel.stop();
  }
  DebatePanel.destroySharedManager();
}
