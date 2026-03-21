# Privacy Policy

**Claude Talk** is an open-source VS Code extension (MIT License) that facilitates AI-powered debates by invoking third-party CLI tools locally on your machine.

**Last updated:** 2026-03-21

---

## Data Collection

Claude Talk itself does **not** collect, store, transmit, or process any personal data. The extension runs entirely on your local machine and has no server, backend, database, or analytics service of its own.

## How Data Flows

When you start a debate, Claude Talk spawns CLI processes (Claude CLI and/or Gemini CLI) that you have independently installed and authenticated. These CLI tools communicate directly with their respective cloud services:

```
Your Machine                          Cloud Services
┌──────────────────┐                  ┌─────────────────┐
│  Claude Talk      │                  │  Anthropic API   │
│  (VS Code ext)   │──spawns──►Claude CLI──────────►│  (claude.ai)     │
│                  │                  └─────────────────┘
│                  │                  ┌─────────────────┐
│                  │──spawns──►Gemini CLI──────────►│  Google AI API   │
│                  │                  │  (ai.google.dev) │
└──────────────────┘                  └─────────────────┘
```

**What is sent to these services:**
- Your debate topic (text you enter)
- Agent prompts and responses (generated during the debate)
- In **Code Mode**: contents of files read from your workspace by CLI tools

**What is NOT sent by Claude Talk:**
- No personal information, device identifiers, or usage analytics
- No data to any service other than the CLI tools you have installed

## Code Mode

When Code Mode is enabled, CLI agents are granted **read-only** access to files in your workspace:

- **Claude CLI**: uses `Read`, `Grep`, `Glob` tools (cannot modify files)
- **Gemini CLI**: uses `--sandbox` flag (sandboxed read access)

File contents read by CLI agents are sent to their respective cloud services as part of the conversation context. **If your codebase contains sensitive or proprietary information, be aware that it will be transmitted to third-party AI services.**

## Telemetry

Claude Talk disables telemetry for all CLI processes by default:

| CLI | Environment Variables Set |
|-----|--------------------------|
| **Claude CLI** | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` — disables Statsig metrics, Sentry error reporting, feedback commands, and surveys |
| **Gemini CLI** | `GEMINI_TELEMETRY_ENABLED=false` — disables telemetry transmission |
| | `GEMINI_TELEMETRY_LOG_PROMPTS=false` — prevents prompt content from being logged |

## Model Training

Whether your data is used for model training depends on your account type with each provider:

| Provider | Free Tier | Paid API |
|----------|-----------|----------|
| **Anthropic (Claude)** | May be used for training. Opt out at [claude.ai/settings](https://claude.ai/settings/data-privacy-controls). | Not used for training. |
| **Google (Gemini)** | May be used for product improvement. | Not used for training. |

For full details, review each provider's terms:
- [Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms)
- [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- [Anthropic Data Usage (Claude Code)](https://code.claude.com/docs/en/data-usage)
- [Gemini API Terms of Service](https://ai.google.dev/gemini-api/terms)
- [Google Privacy Policy](https://policies.google.com/privacy)

## Third-Party Services

Claude Talk acts solely as a local automation layer. The developer of Claude Talk:

- Has no control over how Anthropic or Google process your data
- Is not responsible for changes to third-party privacy policies or terms of service
- Does not receive, access, or benefit from any data sent to these services

You are responsible for reviewing and accepting the terms of service of each CLI tool you install and authenticate.

## Your Choices

- **Don't use Code Mode** if you don't want your source code sent to third-party AI services.
- **Use paid API tiers** if you want contractual guarantees that your data is not used for model training.
- **Review your provider settings** to manage data retention and training preferences.

## Children's Privacy

Claude Talk is not directed at children under 13. We do not knowingly collect any data from children.

## Changes to This Policy

Changes will be reflected in this file with an updated date. Since this is an open-source project, all changes are visible in the git history.

## Contact

For privacy questions or concerns, open an issue at [github.com/studio90scoolkid/claude-talk](https://github.com/studio90scoolkid/claude-talk/issues).
