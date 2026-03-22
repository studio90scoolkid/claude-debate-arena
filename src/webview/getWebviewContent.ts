import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

export function getWebviewContent(
  _webview: vscode.Webview,
  extensionUri: vscode.Uri,
  lang: string,
): string {
  const mediaDir = path.join(extensionUri.fsPath, 'out', 'media');
  const cssContent = fs.readFileSync(path.join(mediaDir, 'style.css'), 'utf-8');
  const jsContent = fs.readFileSync(path.join(mediaDir, 'main.js'), 'utf-8');

  // Load sprite sheets as base64 data URIs
  const spritesDir = path.join(mediaDir, 'sprites');
  const spriteData: Record<string, string> = {};
  // Load all sprite PNGs from sprites dir (idle + hit for all characters)
  try {
    const files = fs.readdirSync(spritesDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
      const filePath = path.join(spritesDir, file);
      try {
        const buf = fs.readFileSync(filePath);
        // key: "mask-dude" for idle, "mask-dude-hit" for hit
        const key = file.replace('-idle.png', '').replace('.png', '');
        spriteData[key] = `data:image/png;base64,${buf.toString('base64')}`;
      } catch { /* skip unreadable files */ }
    }
  } catch { /* sprites dir not found */ }

  const nonce = randomBytes(16).toString('hex');
  const langMap: Record<string, string> = {
    ko: 'ko', ja: 'ja', zh: 'zh', de: 'de', fr: 'fr', es: 'es', pt: 'pt',
    it: 'it', nl: 'nl', pl: 'pl', ru: 'ru', uk: 'uk', cs: 'cs', sv: 'sv',
    da: 'da', fi: 'fi', nb: 'nb', no: 'no', tr: 'tr', el: 'el', hu: 'hu',
    ro: 'ro', th: 'th', vi: 'vi', id: 'id', ms: 'ms', hi: 'hi', bn: 'bn',
    ar: 'ar', he: 'he', fa: 'fa',
  };
  const prefix = lang.split('-')[0].toLowerCase();
  const htmlLang = langMap[prefix] || 'en';

  const spriteJson = JSON.stringify(spriteData);

  return `<!DOCTYPE html>
<html lang="${htmlLang}" data-lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src 'nonce-${nonce}';
             script-src 'nonce-${nonce}';
             img-src data:;">
  <title>Claude Talk</title>
  <style nonce="${nonce}">${cssContent}</style>
</head>
<body>
  <!-- Sprite data injected from extension -->
  <script nonce="${nonce}">window.__SPRITE_DATA__ = ${spriteJson};</script>

  <!-- Top Title Bar -->
  <div class="top-bar">
    <div class="top-bar-left">
      <div class="title">CLAUDE TALK</div>
      <div class="subtitle">STUDIO COOLKID</div>
    </div>
    <div class="connection-status" id="connectionStatus">
      <span class="conn-provider">
        <span class="conn-dot" id="connDotClaude"></span>
        <span class="conn-label" id="connLabelClaude">Claude</span>
        <span class="conn-account" id="connAccountClaude"></span>
      </span>
      <span class="conn-divider">|</span>
      <span class="conn-provider">
        <span class="conn-dot" id="connDotGemini"></span>
        <span class="conn-label" id="connLabelGemini">Gemini</span>
        <span class="conn-account" id="connAccountGemini"></span>
      </span>
      <button class="conn-refresh" id="connRefresh" title="Refresh">&#x21bb;</button>
    </div>
  </div>

  <!-- Setup Panel -->
  <div class="setup-panel">
    <div class="topic-row">
      <button id="modeBtn" class="ctrl-btn ctrl-mode" data-i18n-title="modeGeneral" title="General">GEN</button>
      <input type="text" id="topicInput" class="topic-input" data-i18n-placeholder="topicPlaceholder">
      <div class="control-buttons">
        <button id="startBtn" class="ctrl-btn ctrl-play" data-i18n-title="startBattle">▶</button>
        <button id="pauseBtn" class="ctrl-btn ctrl-pause" disabled data-i18n-title="pause">⏸</button>
        <button id="stopBtn" class="ctrl-btn ctrl-stop" disabled data-i18n-title="stop">⏹</button>
      </div>
    </div>
    <button id="settingsToggle" class="settings-toggle" data-i18n-title="collapseSettings">▲</button>
    <div class="persona-row" id="personaRow">
      <div class="agent-config">
        <div class="agent-config-label agent-a-label">
          <input type="text" id="nameA" class="name-input agent-a-name" value="AGENT A" maxlength="20">
        </div>
        <div class="agent-config-selects">
          <div class="persona-group">
            <label data-i18n="persona"></label>
            <select id="personaA" class="persona-select">
              <option value="pro" selected data-i18n="pro"></option>
              <option value="neutral" data-i18n="neutral"></option>
              <option value="con" data-i18n="con"></option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="character"></label>
            <select id="charA" class="persona-select char-select">
                <option value="mask-dude" selected data-i18n="charMaskDude"></option>
                <option value="ninja-frog" data-i18n="charNinjaFrog"></option>
                <option value="pink-man" data-i18n="charPinkMan"></option>
                <option value="virtual-guy" data-i18n="charVirtualGuy"></option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="provider"></label>
            <select id="providerA" class="persona-select provider-select">
              <option value="claude" selected>Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="model"></label>
            <select id="modelA" class="persona-select model-select">
              <option value="haiku" data-i18n="modelHaiku"></option>
              <option value="sonnet" selected data-i18n="modelSonnet"></option>
              <option value="opus" data-i18n="modelOpus"></option>
            </select>
          </div>
        </div>
      </div>
      <div class="vs-divider">VS</div>
      <div class="agent-config">
        <div class="agent-config-label agent-b-label">
          <input type="text" id="nameB" class="name-input agent-b-name" value="AGENT B" maxlength="20">
        </div>
        <div class="agent-config-selects">
          <div class="persona-group">
            <label data-i18n="persona"></label>
            <select id="personaB" class="persona-select">
              <option value="pro" data-i18n="pro"></option>
              <option value="neutral" data-i18n="neutral"></option>
              <option value="con" selected data-i18n="con"></option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="character"></label>
            <select id="charB" class="persona-select char-select">
                <option value="mask-dude" data-i18n="charMaskDude"></option>
                <option value="ninja-frog" selected data-i18n="charNinjaFrog"></option>
                <option value="pink-man" data-i18n="charPinkMan"></option>
                <option value="virtual-guy" data-i18n="charVirtualGuy"></option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="provider"></label>
            <select id="providerB" class="persona-select provider-select">
              <option value="claude" selected>Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div class="persona-group">
            <label data-i18n="model"></label>
            <select id="modelB" class="persona-select model-select">
              <option value="haiku" data-i18n="modelHaiku"></option>
              <option value="sonnet" selected data-i18n="modelSonnet"></option>
              <option value="opus" data-i18n="modelOpus"></option>
            </select>
          </div>
        </div>
      </div>
      <div class="btn-group">
        <label class="consensus-label">
          <input type="checkbox" id="seekConsensus">
          <span data-i18n="seekConsensus"></span>
        </label>
        <label class="consensus-label">
          <input type="checkbox" id="showSummary" checked>
          <span data-i18n="showSummary"></span>
        </label>
        <label class="consensus-label">
          <input type="checkbox" id="allowConcession" checked>
          <span data-i18n="allowConcession"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Chat Area -->
  <div id="chatArea" class="chat-area"></div>

  <!-- Status Bar -->
  <div class="status-bar">
    <span class="status-bar-left">
      <span><span id="statusDot" class="status-dot"></span><span id="statusText" data-i18n="ready"></span></span>
      <span id="consensusGauge" class="consensus-gauge" style="display:none;">
        <span class="consensus-gauge-label" data-i18n="consensusGaugeLabel"></span>
        <span class="consensus-gauge-bar">
          <span id="consensusGaugeFill" class="consensus-gauge-fill"></span>
        </span>
        <span id="consensusGaugeValue" class="consensus-gauge-value">0%</span>
      </span>
    </span>
    <span id="connInfo" class="conn-info"></span>
  </div>

  <script nonce="${nonce}">${jsContent}</script>
</body>
</html>`;
}
