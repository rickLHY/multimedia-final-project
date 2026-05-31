# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Type-check (tsc --noEmit) — this is the only lint/test step
npm run preview      # Preview production build
```

There are no unit tests. `npm run lint` (TypeScript type-check) is the only automated code quality check.

## Architecture

Single-page React app (React 19 + TypeScript + Vite) that simulates margin trading mechanics — specifically **融資 (Margin Buy)** and **融券 (Short Sale)** — with real-time alarm alerts when margin call thresholds are breached.

### State & calculation flow

All state and margin math lives in [src/App.tsx](src/App.tsx). The app has two top-level modes (`SimulatorMode`) and two UX steps:

- **Step 1**: conceptual intro + parameter configuration (symbol, shares, initial price, MMR)
- **Step 2**: sandbox slider that simulates price movement and triggers alarms

Margin calculations are pure `useMemo` derivations from params state — no external API calls:

| Mode | Margin Call Trigger |
|---|---|
| MARGIN_BUY | `simulatedPrice ≤ (loan - extraCash) / (1 - mmr) / shares` |
| SHORT_SALE | `simulatedPrice ≥ totalMarginBalance / (1 + mmr) / shares` where `totalMarginBalance = initialValue * (1 + imr)` |

IMR is locked at 50%; MMR is user-adjustable (range 25–48% for buy, 25–50% for short).

### Components

- [src/App.tsx](src/App.tsx) — all state, all margin math (`useMemo`), all UI layout (header, left config panel, right workspace)
- [src/components/FormulaGuide.tsx](src/components/FormulaGuide.tsx) — displays the 3 key formulas with live calculated values; receives all params and calculated states as props
- [src/components/InteractiveChart.tsx](src/components/InteractiveChart.tsx) — SVG chart with safe/danger zone shading; responsive via `ResizeObserver`; zones are flipped between buy (danger left) and short (danger right)
- [src/utils/audio.ts](src/utils/audio.ts) — `SoundSynthesizer` singleton managing Web Audio API alarm beeps + `SpeechSynthesis` Chinese (zh-TW) narration; `startAlarm()` runs on an 840ms interval

### Audio behavior

The `soundSynthesizer` singleton coordinates two audio channels:
1. **Alarm**: oscillator-based beep repeating every 840ms when margin call is active
2. **Narration**: `window.speechSynthesis` speaks Chinese step descriptions (triggered on step/mode change) and warning announcements (triggered once on first margin call entry)

The alarm is stopped on mode switch, step 1 navigation, and the "安全水位恢補" quick-recovery button.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`). The design uses a dark zinc palette: `#09090B` (background), `#18181B` (card), `#27272A` (border), `#22C55E` (green accent). A full-screen red strobe overlay (`motion/react`) pulses when margin call is active in step 2.

## Environment

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. The `@google/genai` package is listed as a dependency but the Gemini API is not currently used in the application code — the key is injected automatically in AI Studio deployments.
