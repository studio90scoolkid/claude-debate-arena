# Changelog

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
