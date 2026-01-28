# Changelog

All notable changes to the Enrique K Chan Portfolio Agent will be documented in this file.

## [1.1.0] - 2026-01-27

### Added
- **Real-Time Utility Intents**: 
  - Integrated `weather` intent with a visual Seattle dashboard 🌧️.
  - Added `stock` intent for live GOOGL market data 📈.
  - Added `time` intent for precision clock and calendar synchronization 🕒.
- **Dynamic Quiz System**: Replaced hardcoded certification quiz with a context-aware generator covering Google Cloud, AWS, Olympics, and Agentic AI 🧠.
- **Premium Visual Assets**: Added `bubble_head_2.png` and implemented a multi-bubble profile gallery in the Hall of Mastery.
- **Always-A2UI Logic**: Orchestrator now ensures almost every query (including `general` intent) returns a high-fidelity visual response.
- **New Components**: Registered `StrategicMatrix` and `SkillRadar` for complex data visualizations.

### Improved
- **Horizontal Scrolling**: Upgraded the `Row` component with `flex-shrink: 0` to support sleek, swipeable testimonial carousels.
- **Model Branding**: Standardized model identification to **Gemini 2.5 Flash** across the interface.
- **Intent Classification**: Hardened backend and frontend LLM prompts to prevent refusals for utility requests ("Never Refuse Utility Requests").
- **Visual Polish**: Added thematic emojis and Material Icons across all dynamic dashboard components for a more premium agentic feel.

### Fixed
- **A2UI Rendering**: Resolved issues where utility prompts were defaulting to plain text due to over-strict model personality.
- **Layout Integrity**: Fixed bug where testimonial cards were shrinking on resize.
