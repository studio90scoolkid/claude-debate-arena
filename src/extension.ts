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
}

export async function deactivate() {
  if (DebatePanel.currentPanel) {
    await DebatePanel.currentPanel.stop();
  }
}
