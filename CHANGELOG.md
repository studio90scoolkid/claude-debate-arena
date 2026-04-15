# Changelog

## [0.7.6] - 2026-04-15

### Fixed
- Fix `spawn EINVAL` on Windows when launching CLI wrappers (`claude.cmd`, `gemini.cmd`, `codex.cmd`) caused by Node.js CVE-2024-27980 restriction; added a `spawnCli` helper that routes `.cmd`/`.bat` through `shell: true` with proper argument escaping

## [0.7.5] - 2026-04-02

### Fixed
- Fix Claude CLI "Session ID already in use" error by auto-retrying with a new session ID (with retry cap)
- Fix Gemini session resume using `--resume latest` which could resume wrong session; now uses captured session ID when available
- Fix neutral persona always treated as Agent A in debate progress summary, causing wrong message attribution when Agent B is neutral
- Fix tier string normalization inconsistency causing paid-tier models to appear locked for Gemini/Codex users
- Fix cross-provider model assignment (e.g. Claude model sent to Gemini) by adding runtime validation with safe fallback
- Simplify summary generation provider selection logic

## [0.7.4] - 2026-03-31

### Fixed
- Fix Gemini CLI compatibility with older versions (v0.1.x) by removing empty `-p ''` flag; use stdin-only prompt delivery
- Remove Gemini 3 Pro from model selection (invalid model name without `-preview` suffix)
- Fix summary generation using non-existent `gemini-3-pro` model; now uses `gemini-2.5-pro`

## [0.7.3] - 2026-03-27

### Changed
- Move debate option checkboxes (Seek Consensus, Show Summary, Allow Concession) into a settings popup accessible via gear icon in the top bar
- Settings popup closes on outside click, stays closed on restart, and remains accessible during debates (with checkboxes disabled)

## [0.7.2] - 2026-03-27

### Changed
- Summary generation now uses the best model for each provider (Codex: gpt-5.4 instead of gpt-5.4-mini)

## [0.7.1] - 2026-03-27

### Changed
- Remove Gemini 3 Flash from model selection (unstable); revert default Gemini model to 2.5 Flash
- Update screenshots to reflect v0.7.0 UI with Codex provider

## [0.7.0] - 2026-03-27

### Added
- **OpenAI Codex provider** — third AI provider with GPT-5.4, GPT-5.4 Mini, o4-mini, and o3-mini model support; mix and match Claude, Gemini, and Codex per agent
- **Gemini 3 models** — Gemini 3 Flash and Gemini 3 Pro added to model selection (default changed to Gemini 3 Flash)
- **Provider tier display** — connection status bar now shows account tier (free/paid) for each provider

### Changed
- Summary generation now intelligently selects the CLI based on which providers are in use, with Codex fallback support

## [0.6.6] - 2026-03-26

### Fixed
- **Gemini CLI compatibility** — removed unsupported `--output-format json` flag that caused "exited with code 1" errors on all Gemini CLI versions
- **Gemini session resume** — use `--resume latest` instead of non-existent session IDs, matching Gemini CLI's actual interface
- **Gemini response parsing** — handle plain text responses as default, with JSON as optional fallback

## [0.6.5] - 2026-03-24

### Fixed
- **Gemini CLI prompt delivery** — prompts are now passed via stdin instead of command-line arguments, fixing crashes caused by long prompts exceeding OS argument limits or special characters being misinterpreted as CLI flags

## [0.6.4] - 2026-03-23

### Fixed
- **CLI binary discovery on other machines** — `~/.local/bin/` added to search paths (where `claude install` places the binary), plus `npm prefix -g` fallback for non-standard npm setups
- **Gemini auth check too strict** — `oauth_creds.json` is now checked directly regardless of `settings.json` authType field, fixing false "not authenticated" on some Gemini CLI versions
- **Cross-platform support** — Windows-compatible binary paths (`.cmd`), `where` instead of `which`, `os.homedir()` instead of `process.env.HOME`, and platform-aware PATH separators

### Changed
- Claude auth check now verifies CLI is callable (`--version`) before running `auth status`, with better text-based fallback parsing for non-JSON output
- Improved debug logging for auth checks in Output panel (`AI Debate` channel)

## [0.6.3] - 2026-03-22

### Added
- **Collapsible settings panel** — toggle button (▲/▼) to collapse/expand agent configuration, keeping the UI compact during debates
- Settings panel collapse state persists across sessions via auto-save
- i18n support for collapse/expand tooltips (EN, KO, JA, ZH)

## [0.6.2] - 2026-03-21

### Added
- **Privacy policy** — dedicated `PRIVACY.md` covering data flows, Code Mode file access, model training policies, and third-party service disclaimers
- **Telemetry disabled by default** — Claude CLI (`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`) and Gemini CLI (`GEMINI_TELEMETRY_ENABLED=false`, `GEMINI_TELEMETRY_LOG_PROMPTS=false`) telemetry is now automatically disabled for all spawned CLI processes
- **Privacy & Data Usage** section in README with provider-specific training policies, environment variable details, and link to full privacy policy

## [0.6.1] - 2026-03-21

### Added
- **Webview state persistence** — debate messages, settings, thinking indicator, and consensus gauge now survive window detach/reattach and auxiliary window moves
- `WebviewPanelSerializer` registration so VS Code can restore the panel after window moves without losing the running debate
- `onWebviewPanel:aiDebate` activation event for reliable panel deserialization
- Chat messages are now persisted to `globalState` (disk) as a fallback when in-memory state is lost during extension restarts
- `requestState` / `restoreState` message pair — webview always requests authoritative state from the extension host on init
- Shared `DebateManager` — the debate engine instance is reused across panel dispose/revive cycles so running debates are not interrupted

### Fixed
- **Window detach/reattach losing all UI state** — moving the panel to a separate window or between editor groups no longer resets the debate to the initial screen
- Thinking indicator ("...") now restored after window move when a debate is running
- Welcome screen no longer persists behind restored messages after a window move
- Turn counter no longer double-increments on retry — `turnCount` is now derived from history length instead of being mutably incremented
- `buildFollowUpPrompt` safety fallback when called with empty history (treats as first turn instead of crashing)

### Changed
- `DebatePanel.dispose()` no longer stops the debate or destroys the `DebateManager` — only removes event listeners so the panel can be revived with state intact
- `DebateSettings` interface extended with `providerA`, `providerB`, `seekConsensus`, `showSummary`, `allowConcession` fields
- HTML-escape agent names and summary text before `innerHTML` insertion to prevent XSS
- Stopped banner deduplication — `updateState('stopped')` now checks for existing `stopped-banner` elements and accepts a `skipBanner` parameter for restore paths

## [0.6.0] - 2026-03-20

### Added
- **Code Mode** — new toggle button (`GEN` / `</>`) before the topic input that switches between general debate and codebase-aware debate
- In Code Mode, agents explore the workspace using file-reading tools (Read, Grep, Glob) and ground their arguments in actual code
- Claude agents get `--allowedTools Read,Grep,Glob` with `cwd` set to the workspace root (read-only access)
- Gemini agents get `--sandbox` with `cwd` set to the workspace root
- Code-analysis system prompt instructs agents to reference file paths, function names, and short code snippets
- Mode persists across sessions via settings auto-save
- i18n for mode button tooltips and code-mode placeholder (EN, KO, JA; others fallback to English)
- Error message when Code Mode is used without an open workspace folder

### Changed
- Stronger language enforcement for Gemini — `CRITICAL LANGUAGE REMINDER` appended at the end of both first-turn and follow-up prompts to prevent language mismatch (e.g., Korean responses to English topics)

## [0.5.4] - 2026-03-20

### Added
- **Concession system** — agents can now concede defeat when they have no valid counterargument left, auto-stopping the debate with a concession banner
- "Allow Concession" checkbox (enabled by default) with i18n support for all 30+ languages
- Late-game strategy hints (turn 6+) now remind agents of the `[CONCEDE]` option to prevent endless wrap-up loops

### Changed
- Extracted shared prompt logic into `promptBuilder.ts` — eliminates ~300 lines of duplication between ClaudeAgent and GeminiAgent
- "Moderator Summary" renamed to "Summary" across all UI labels, banners, and loading text in all 30+ languages
- "Debate Ended" banner no longer appears when consensus or concession banner is already shown
- Stronger language enforcement for Gemini — explicit language rule repeated in first-turn and follow-up prompts

## [0.5.3] - 2026-03-20

### Changed
- Complete overhaul of debate system prompts for natural, conversational tone — agents now sound like sharp friends arguing, not academics writing papers
- Language-specific tone guides for Korean, Japanese, Chinese, and English with concrete register examples (e.g., ~거든/~잖아 for Korean, contractions for English)
- Persona prompts rewritten with distinct personalities and argumentation styles for Pro, Neutral, and Con
- First-turn prompt redesigned to produce direct openers instead of generic "I believe" statements
- Follow-up turn structure changed from rigid 3-part format to natural response flow
- Moderator summary prompt updated to neutral recap style (no more "audience" or "viewers" references)
- Provider auth checks now run independently — UI unlocks per-provider as each check completes
- Start button enables as soon as selected providers are ready, without waiting for all checks

### Added
- Em-dash (—) ban enforced in prompts to prevent unnatural punctuation
- Anti-flattery and anti-rhetorical-question rules to maintain debate tension
- `updateStartBtnState()` function for smarter start button state management
- Per-provider `providerReady` message type for incremental UI updates

## [0.5.2] - 2026-03-19

### Changed
- Structured debate flow — each turn now requires agents to directly rebut opponent's claim, present new evidence, and pose a challenge
- Debate progress tracking — follow-up prompts include a summary of recent arguments from both sides to prevent repetition
- Opponent message cap raised from 600 to 1000 characters for better context retention
- System prompt now enforces "engage with opponent's specific claims first" rule

## [0.5.1] - 2026-03-19

### Changed
- Control buttons (start/pause/stop) replaced with compact player-style icons (▶ ⏸ ⏹) placed next to the topic input
- Button tooltip text unified to title case across all 27 languages with i18n support (`data-i18n-title`)
- Welcome description updated to reference ▶ icon instead of button text

### Added
- "Debate Ended" banner in chat area when debate is stopped — red-themed, matching consensus banner style, with i18n for all 27 languages
- Minimum width constraint on setup panel and agent config containers to prevent layout collapse on narrow windows

### Fixed
- Checkbox options no longer wrap to the next line when window is narrowed (`flex-wrap: nowrap`, `flex-shrink: 0`)

## [0.5.0] - 2026-03-19

### Added
- Consensus gauge — real-time progress bar in the status bar showing how close agents are to agreement
- Self-reported consensus scoring — each agent rates agreement level (0-100) via `[CONSENSUS:XX]` marker every turn
- Color-coded gauge transitions: red (0-30%) → yellow (30-60%) → green (60-100%)
- Full i18n for consensus gauge label across all 32 languages

### Changed
- **Natural consensus flow** — removed rigid turn-based consensus forcing; agents now debate genuinely and only converge when truly persuaded
- Consensus strategy hints extended from 5 to 9+ turns for deeper discussions before agreement
- Consensus only triggers when both agents report 70%+ agreement (previously triggered after ~3 turns)
- Gauge only updates after both agents have reported at least one score
- Agent names are now locked (disabled) during active debate

### Fixed
- Moderator summary from previous debate leaking into new debate — summary process is now tracked and killed on stop/restart

### Removed
- Message count and token usage display from status bar (cleaner UI)

## [0.4.1] - 2026-03-18

### Added
- Moderator Summary toggle — option to enable/disable end-of-debate summary (enabled by default)
- Summary now uses top-tier models (Claude Opus / Gemini 2.5 Pro)
- Full i18n for seekConsensus, showSummary, and consensusReached across all 32 languages

### Changed
- Checkboxes disabled during active debate to prevent confusion
- Compact checkbox styling for tighter layout

## [0.4.0] - 2026-03-18

### Added
- Google Gemini support — use Gemini 2.5 Flash or Gemini 2.5 Pro as debate agents via Gemini CLI
- Mix-and-match providers per agent (e.g., Claude Sonnet vs Gemini 2.5 Pro)
- Per-provider connection status indicators with 3-state display (green: connected, yellow: installed but not authenticated, red: not installed)
- Per-provider account info in top status bar (Claude email/subscription, Gemini email from OAuth)
- Gemini authentication check via local config files (`~/.gemini/settings.json`, `oauth_creds.json`) — zero token cost
- Bottom status bar shows agent model matchup during debate (e.g., "Agent A: Sonnet vs Agent B: Gemini 2.5 Pro")

## [0.3.0] - 2026-03-17

### Added
- Moderator summary — when a debate ends (by stop or consensus), a Claude Haiku agent automatically summarizes the entire debate as a moderator
- Loading indicator while summary is being generated
- Blue-themed summary banner with glow animation
- i18n support for moderator summary (EN/KO, others fallback to English)

## [0.2.2] - 2026-03-16

### Changed
- Updated keywords for better marketplace discoverability
- Cleaned up README descriptions

## [0.2.1] - 2026-03-16

### Changed
- Session-based debate architecture — each agent maintains its own persistent Claude CLI session across turns
- All prompts converted to English for language-neutral behavior — agents now respond in the same language as the debate topic
- No-markdown rule enforced in system prompt

### Added
- Screenshot added to README

## [0.2.0] - 2026-03-15

### Added
- Seek Consensus mode — agents gradually find common ground instead of debating endlessly
- Auto-stop when consensus is reached with visual banner notification
- Consensus checkbox with RPG-styled UI

### Changed
- Improved button layout — compact vertical arrangement in setup panel
- GitHub repository renamed to claude-talk

## [0.1.2] - 2026-03-15

### Fixed
- README icon now uses absolute URL for correct marketplace display

## [0.1.1] - 2026-03-15

### Changed
- Renamed to Claude Talk
- Updated extension icon
- Improved marketplace description and README

## [0.1.0] - 2026-03-13

### Added
- Two AI agents debate any topic using Claude CLI
- Retro RPG-style pixel art interface with sprite animations
- 4 hero characters (Mask Dude, Ninja Frog, Pink Man, Virtual Guy)
- Customizable agent names, personas (Pro/Neutral/Con), and models (Haiku/Sonnet/Opus)
- Smart history summarization to keep debates fresh
- Turn-aware strategy hints for diverse arguments
- Settings persistence across sessions
- Full i18n support for 30+ languages
- Pause, resume, and stop debate controls
