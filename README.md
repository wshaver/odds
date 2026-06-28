# odds

Never tell me the odds! But do help me memorize them.

`odds` is a browser-based poker odds trainer for practicing one-card-ahead Texas Hold'em decisions. It deals deterministic training prompts, asks for the right odds or action, and gives immediate feedback with outs, win probability, required equity, and expected value.

## Features

- **Odds mode**: estimate the hero hand's win chance from a flop or turn board.
- **Bet mode**: decide whether calling a turn bet is profitable from pot odds and direct win probability.
- **Chase mode**: choose the smallest bet that makes Biff's call unprofitable.
- **Campaign mode**: alternate Bet and Chase hands against a local bankroll.
- **Shareable prompts**: the current hand is encoded in the URL hash.
- **Local progress**: answered prompts, mode stats, streaks, and campaign state are stored in `localStorage`.
- **Winning card reveal**: after answering, the trainer can show which remaining cards make each player win.

## Tooling

This is a Vite React app written in TypeScript.

```bash
npm install
npm run dev
```

The dev server is configured to bind to `127.0.0.1`.

### Scripts

```bash
npm run dev                   # Start the Vite dev server
npm test                      # Run Vitest once
npm run test:watch            # Run Vitest in watch mode
npm run build                 # Type-check with tsc, then build with Vite
npm run generate:win-chances  # Regenerate common odds answer options
```

## Project Structure

```text
src/
  App.tsx                     # Top-level mode, campaign, hash, and profile wiring
  components/                 # React UI components for the trainer table and cards
  engine/                     # Cards, poker hand evaluation, next-card enumeration, pot odds math
  profile/                    # localStorage-backed player profile and campaign state
  prompts/                    # Deterministic prompt generation, answer models, hash routing
  test/                       # Shared Vitest setup
scripts/
  generate-common-win-chance-options.ts
```

## Design Decisions

- **No server dependency**: all gameplay, scoring, persistence, and routing run in the browser.
- **Deterministic prompts**: prompts are generated from compact alphanumeric seeds, so a URL hash can reproduce the same hand and answer model.
- **Domain logic outside React**: cards, hand ranking, next-card enumeration, pot odds, prompt generation, and profile updates live in plain TypeScript modules with focused tests.
- **Exact one-card enumeration**: the trainer evaluates every legal next board card instead of using simulation for the displayed win chance.
- **Custom poker evaluator**: the project does not depend on a poker engine library; `src/engine/handEvaluator.ts` evaluates 5- to 7-card hands and compares tie breakers.
- **Hash routing instead of app router dependency**: `src/prompts/hashRouter.ts` parses and validates prompt state directly from `window.location.hash`.
- **Local persistence with defensive fallbacks**: profile reads and writes tolerate unavailable or invalid `localStorage` and fall back to a default profile.
- **Generated answer distribution data**: common odds options are precomputed by `scripts/generate-common-win-chance-options.ts` and committed in `src/prompts/commonWinChanceOptions.ts`.
- **Responsive single-screen trainer**: the UI is styled with plain CSS in `src/styles.css`, using a poker-table layout, accessible labels, focus states, and responsive constraints.

## Third-Party Libraries

Runtime dependencies:

- `react`
- `react-dom`

Build and development dependencies:

- `@vitejs/plugin-react`
- `vite`
- `typescript`
- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `@types/react`
- `@types/react-dom`

Notably, the poker rules, hand evaluator, odds enumeration, pot odds formulas, hash parsing, and profile store are implemented in this repository rather than pulled from third-party packages.

## Verification

```bash
npm test
npm run build
```
