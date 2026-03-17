<p align="center">
  <img src="https://raw.githubusercontent.com/studio90scoolkid/claude-talk/main/icon.png" width="256" height="256" alt="Claude Talk">
</p>

<h1 align="center">Claude Talk</h1>

<p align="center">
  <strong>Two AI agents debate any topic — right inside VS Code.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=STUDIOCOOLKID.claude-talk"><img src="https://img.shields.io/visual-studio-marketplace/v/STUDIOCOOLKID.claude-talk?style=flat-square&color=blue" alt="Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=STUDIOCOOLKID.claude-talk"><img src="https://img.shields.io/visual-studio-marketplace/i/STUDIOCOOLKID.claude-talk?style=flat-square&color=green" alt="Installs"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=STUDIOCOOLKID.claude-talk"><img src="https://img.shields.io/visual-studio-marketplace/r/STUDIOCOOLKID.claude-talk?style=flat-square&color=yellow" alt="Rating"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/studio90scoolkid/claude-talk/main/screenshot_1.png" width="800" alt="Claude Talk Screenshot">
</p>

---

## What is this?

**Claude Talk** pits two Claude-powered AI agents against each other to debate any topic you choose. Each agent takes a stance (Pro, Neutral, or Con) and argues its position in real-time.

> Pick a topic. Choose your fighters. Hit START. Grab some popcorn.

### Why use Claude Talk?

Two AI agents debating from different perspectives can do more than entertain:

- **Gain fresh insights** — uncover angles you hadn't considered on difficult problems
- **Expand your ideas** — watch agents build on and challenge a concept from multiple directions
- **Deep-dive any topic** — explore philosophy, architecture decisions, ethical dilemmas, or technical trade-offs in depth
- **Break through dead ends** — when you're stuck, let two opposing viewpoints spark a new path forward
- **Learn by observation** — see how structured arguments are built, countered, and refined in real time

---

## Features

| Feature | Description |
|---------|-------------|
| **Real-time AI Debate** | Two Claude agents argue back and forth automatically |
| **Seek Consensus Mode** | Agents gradually find common ground instead of arguing forever |
| **3 Stance Modes** | Set each agent as **Pro**, **Neutral**, or **Con** |
| **Model Selection** | Mix and match **Haiku**, **Sonnet**, or **Opus** per agent |
| **Custom Agent Names** | Name your debaters anything you want |
| **Persistent Sessions** | Each agent maintains its own Claude CLI session with full context retention |
| **30+ Languages** | Full UI localization — Korean, Japanese, Chinese, Spanish, French, and more |
| **Auto-save Settings** | Your last configuration is restored automatically |
| **Debate Controls** | Pause, resume, or stop debates at any time |

---

## Quick Start

1. Install [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) and authenticate (`claude login`)
2. Install this extension from the VS Code Marketplace
3. Open Command Palette → **Claude Talk: Start**
4. Enter a topic, pick characters & stances, and hit **START**

---

## How It Works

```
┌─────────────┐     debate topic      ┌─────────────┐
│   Agent A    │ ◄──────────────────► │   Agent B    │
│  (Claude)    │   turn-by-turn       │  (Claude)    │
│  Pro/Con     │   via Claude CLI     │  Pro/Con     │
└─────────────┘                       └─────────────┘
```

Each agent maintains its own **persistent Claude CLI session** throughout the debate. This means:
- **Full context retention** — Claude natively remembers the entire debate history per agent
- **Language-neutral prompts** — agents automatically respond in the same language as your topic
- **Turn-aware strategy hints** — arguments evolve over time with new angles each turn
- **Lower token usage** — no need to resend history every turn

This means debates stay coherent and on-topic even after 10+ exchanges.

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **Claude CLI** | **1.0.0 or later** — [Install guide](https://docs.anthropic.com/en/docs/claude-cli). Must be authenticated (`claude login`). Older versions may not support session management or `auth status`. |
| **VS Code** | 1.85.0 or later |
| **Anthropic API** | Active API access via Claude CLI |

---

## Extension Commands

| Command | Description |
|---------|-------------|
| `Claude Talk: Start` | Open the Claude Talk panel |
| `Claude Talk: Stop` | Stop an ongoing debate |

---

## Supported Languages

English, 한국어, 日本語, 中文, Español, Français, Deutsch, Português, Italiano, Русский, العربية, हिन्दी, Tiếng Việt, ไทย, Bahasa Indonesia, Bahasa Melayu, Filipino, Türkçe, Polski, Nederlands, Svenska, Norsk, Dansk, Suomi, Čeština, Română, Magyar, Ελληνικά, עברית, Українська, فارسی, বাংলা

---

## Tips

- **Use different models** for each agent (e.g., Opus vs Haiku) to see how reasoning depth affects arguments
- **Try unusual topics** — philosophical dilemmas, code architecture debates, or pop culture hot takes work great
- **Switch stances mid-config** — set both agents to "Pro" for an agreement spiral, or both to "Con" for mutual destruction

---

## Made by

**STUDIO COOLKID**

---

## License

[MIT](LICENSE) — do whatever you want with it.
