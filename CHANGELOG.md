# Changelog

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
