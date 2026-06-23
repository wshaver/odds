# Poker Odds Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browser-only poker odds trainer described in `docs/superpowers/specs/2026-06-23-poker-odds-trainer-design.md`.

**Architecture:** Use a Vite + React + TypeScript shell with a framework-independent poker engine. The URL hash is the source of truth for the active prompt, while a versioned localStorage JSON blob stores profile stats and answered prompt records.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, modern Chrome/Safari APIs.

---

## File Structure

- Create: `package.json` - scripts and dependencies.
- Create: `index.html` - Vite entry HTML.
- Create: `tsconfig.json` - TypeScript project config.
- Create: `tsconfig.node.json` - Vite config TypeScript config.
- Create: `vite.config.ts` - Vite and Vitest config.
- Create: `src/main.tsx` - React entry point.
- Create: `src/App.tsx` - top-level application state and prompt flow.
- Create: `src/styles.css` - responsive app styling.
- Create: `src/engine/cards.ts` - card types, deck, parser, formatting.
- Create: `src/engine/handEvaluator.ts` - poker hand category evaluator.
- Create: `src/engine/enumerator.ts` - single-next-card outcome enumeration.
- Create: `src/engine/potOdds.ts` - call/fold threshold logic.
- Create: `src/prompts/types.ts` - prompt, mode, target, and answer types.
- Create: `src/prompts/hashRouter.ts` - hash parse, validate, canonicalize, write.
- Create: `src/prompts/seededRandom.ts` - deterministic PRNG utilities.
- Create: `src/prompts/questionGenerator.ts` - new prompt generation and answer options.
- Create: `src/profile/profileStore.ts` - versioned localStorage profile blob.
- Create: `src/components/CardView.tsx` - playing card rendering.
- Create: `src/components/TrainerView.tsx` - shared prompt layout and answer flow.
- Create: `src/test/setup.ts` - test setup.
- Create tests beside implementation files as `*.test.ts` or `*.test.tsx`.
- Modify: `README.md` - add run/test instructions after the app exists.

---

### Task 1: Scaffold Vite React TypeScript App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Modify: `README.md`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "odds",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create Vite HTML entry**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Odds</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create TypeScript and Vite configs**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
});
```

- [ ] **Step 4: Create minimal React app**

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <h1>Odds</h1>
      <p>Never tell me the odds. But do help me memorize them.</p>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #172019;
  background: #f6f3eb;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 6: Verify scaffold**

Run:

```bash
npm run build
npm test
```

Expected: build succeeds. Vitest reports no test files or zero tests without TypeScript errors.

- [ ] **Step 7: Update README**

Replace `README.md` with:

````md
# odds

Never tell me the odds! But do help me memorize them.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```
````

- [ ] **Step 8: Commit scaffold**

Run:

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts src README.md
git commit -m "Initialize browser app scaffold"
```

Expected: commit succeeds.

---

### Task 2: Cards, Deck, and Compact Parser

**Files:**
- Create: `src/engine/cards.ts`
- Create: `src/engine/cards.test.ts`

- [ ] **Step 1: Write failing card and deck tests**

Create `src/engine/cards.test.ts`:

```ts
import {
  buildDeck,
  cardToString,
  parseCard,
  parseCardList,
  removeKnownCards,
} from "./cards";

describe("cards", () => {
  it("builds a 52-card deck with unique compact ids", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardToString)).size).toBe(52);
  });

  it("parses compact card ids and card lists", () => {
    expect(parseCard("Qs")).toEqual({ rank: "Q", suit: "s" });
    expect(parseCardList("6s7sKh")).toEqual([
      { rank: "6", suit: "s" },
      { rank: "7", suit: "s" },
      { rank: "K", suit: "h" },
    ]);
  });

  it("rejects invalid card strings", () => {
    expect(() => parseCard("1s")).toThrow("Invalid card");
    expect(() => parseCard("Qx")).toThrow("Invalid card");
    expect(() => parseCardList("Qs7")).toThrow("Invalid card list");
  });

  it("removes known cards and rejects duplicates", () => {
    const deck = buildDeck();
    const remaining = removeKnownCards(deck, parseCardList("AsAdKh"));
    expect(remaining).toHaveLength(49);
    expect(remaining.map(cardToString)).not.toContain("As");
    expect(() => removeKnownCards(deck, parseCardList("AsAs"))).toThrow(
      "Duplicate known card",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/engine/cards.test.ts
```

Expected: FAIL because `src/engine/cards.ts` does not exist.

- [ ] **Step 3: Implement card model and parser**

Create `src/engine/cards.ts`:

```ts
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export type Card = {
  rank: Rank;
  suit: Suit;
};

const rankSet = new Set<string>(RANKS);
const suitSet = new Set<string>(SUITS);

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function parseCard(value: string): Card {
  if (value.length !== 2) {
    throw new Error(`Invalid card: ${value}`);
  }

  const [rank, suit] = value.split("");
  if (!rankSet.has(rank) || !suitSet.has(suit)) {
    throw new Error(`Invalid card: ${value}`);
  }

  return { rank: rank as Rank, suit: suit as Suit };
}

export function parseCardList(value: string): Card[] {
  if (value.length % 2 !== 0) {
    throw new Error(`Invalid card list: ${value}`);
  }

  const cards: Card[] = [];
  for (let index = 0; index < value.length; index += 2) {
    cards.push(parseCard(value.slice(index, index + 2)));
  }
  return cards;
}

export function buildDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

export function removeKnownCards(deck: Card[], knownCards: Card[]): Card[] {
  const knownIds = knownCards.map(cardToString);
  const uniqueKnownIds = new Set(knownIds);

  if (uniqueKnownIds.size !== knownIds.length) {
    throw new Error("Duplicate known card");
  }

  return deck.filter((card) => !uniqueKnownIds.has(cardToString(card)));
}
```

- [ ] **Step 4: Run card tests**

Run:

```bash
npm test -- src/engine/cards.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit card model**

Run:

```bash
git add src/engine/cards.ts src/engine/cards.test.ts
git commit -m "Add card parser and deck model"
```

Expected: commit succeeds.

---

### Task 3: Hand Category Evaluator

**Files:**
- Create: `src/engine/handEvaluator.ts`
- Create: `src/engine/handEvaluator.test.ts`

- [ ] **Step 1: Write failing hand evaluator tests**

Create `src/engine/handEvaluator.test.ts`:

```ts
import { parseCardList } from "./cards";
import { compareCategoryToTarget, evaluateBestCategory } from "./handEvaluator";

describe("handEvaluator", () => {
  it.each([
    ["royal flush as straight flush", "AsKsQsJsTs9d2c", "straight-flush"],
    ["four of a kind", "AsAdAhAcKs2d3c", "four-kind"],
    ["full house", "AsAdAhKsKd2d3c", "full-house"],
    ["flush", "AsJs8s4s2sKd3c", "flush"],
    ["straight", "9s8d7h6c5sKd2c", "straight"],
    ["wheel straight", "As2d3h4c5sKdQc", "straight"],
    ["trips", "AsAdAhKsQd2d3c", "trips"],
    ["two pair", "AsAdKhKcQd2d3c", "two-pair"],
    ["pair", "AsAdKhQc9d2d3c", "pair"],
    ["high card", "AsKdQh9c7d4d2c", "high-card"],
  ])("recognizes %s", (_label, cards, expected) => {
    expect(evaluateBestCategory(parseCardList(cards))).toBe(expected);
  });

  it("compares categories against a generic target", () => {
    expect(compareCategoryToTarget("full-house", "trips")).toBe("win");
    expect(compareCategoryToTarget("trips", "trips")).toBe("push");
    expect(compareCategoryToTarget("two-pair", "trips")).toBe("miss");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/engine/handEvaluator.test.ts
```

Expected: FAIL because `handEvaluator.ts` does not exist.

- [ ] **Step 3: Implement category evaluator**

Create `src/engine/handEvaluator.ts`:

```ts
import type { Card, Rank } from "./cards";

export const HAND_CATEGORIES = [
  "high-card",
  "pair",
  "two-pair",
  "trips",
  "straight",
  "flush",
  "full-house",
  "four-kind",
  "straight-flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];
export type OutcomeBucket = "win" | "push" | "miss";

const categoryStrength = new Map<HandCategory, number>(
  HAND_CATEGORIES.map((category, index) => [category, index]),
);

const rankValue: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function evaluateBestCategory(cards: Card[]): HandCategory {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  const rankCounts = countBy(cards.map((card) => card.rank));
  const suitGroups = groupBy(cards, (card) => card.suit);
  const counts = [...rankCounts.values()].sort((a, b) => b - a);
  const hasFlush = [...suitGroups.values()].some((group) => group.length >= 5);
  const hasStraight = hasStraightFromRanks([...rankCounts.keys()]);
  const hasStraightFlush = [...suitGroups.values()].some(
    (group) => group.length >= 5 && hasStraightFromRanks(group.map((card) => card.rank)),
  );

  if (hasStraightFlush) return "straight-flush";
  if (counts[0] === 4) return "four-kind";
  if (counts[0] === 3 && counts.some((count, index) => index > 0 && count >= 2)) {
    return "full-house";
  }
  if (hasFlush) return "flush";
  if (hasStraight) return "straight";
  if (counts[0] === 3) return "trips";
  if (counts.filter((count) => count >= 2).length >= 2) return "two-pair";
  if (counts[0] === 2) return "pair";
  return "high-card";
}

export function compareCategoryToTarget(
  category: HandCategory,
  target: HandCategory,
): OutcomeBucket {
  const categoryValue = categoryStrength.get(category);
  const targetValue = categoryStrength.get(target);

  if (categoryValue === undefined || targetValue === undefined) {
    throw new Error("Unknown hand category");
  }

  if (categoryValue > targetValue) return "win";
  if (categoryValue === targetValue) return "push";
  return "miss";
}

function hasStraightFromRanks(ranks: Rank[]): boolean {
  const values = new Set(ranks.map((rank) => rankValue[rank]));
  if (values.has(14)) {
    values.add(1);
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  let runLength = 1;

  for (let index = 1; index < sortedValues.length; index += 1) {
    if (sortedValues[index] === sortedValues[index - 1] + 1) {
      runLength += 1;
      if (runLength >= 5) return true;
    } else {
      runLength = 1;
    }
  }

  return false;
}

function countBy<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function groupBy<T, K>(values: T[], keyFn: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}
```

- [ ] **Step 4: Run evaluator tests**

Run:

```bash
npm test -- src/engine/handEvaluator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit evaluator**

Run:

```bash
git add src/engine/handEvaluator.ts src/engine/handEvaluator.test.ts
git commit -m "Add poker hand category evaluator"
```

Expected: commit succeeds.

---

### Task 4: Single-Card Enumeration and Pot Odds

**Files:**
- Create: `src/engine/enumerator.ts`
- Create: `src/engine/enumerator.test.ts`
- Create: `src/engine/potOdds.ts`
- Create: `src/engine/potOdds.test.ts`

- [ ] **Step 1: Write failing enumeration and pot odds tests**

Create `src/engine/enumerator.test.ts`:

```ts
import { parseCardList } from "./cards";
import { enumerateNextCardOutcomes } from "./enumerator";

describe("enumerator", () => {
  it("counts flush outs as wins against trips from the turn", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKs"),
      board: parseCardList("2s7s9dQc"),
      target: "trips",
    });

    expect(result.remaining).toBe(46);
    expect(result.win).toBe(9);
    expect(result.push).toBe(0);
    expect(result.miss).toBe(37);
    expect(result.winProbability).toBeCloseTo(9 / 46);
  });

  it("counts matching target category as push, not win", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKd"),
      board: parseCardList("Ah7c2d9s"),
      target: "trips",
    });

    expect(result.push).toBe(2);
    expect(result.win).toBe(0);
  });

  it("does not remove imagined opponent cards", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("6s7s"),
      board: parseCardList("8s9dKh2s"),
      target: "two-pair",
    });

    expect(result.remaining).toBe(46);
  });
});
```

Create `src/engine/potOdds.test.ts`:

```ts
import { shouldCall } from "./potOdds";

describe("potOdds", () => {
  it("calls when win probability meets required equity", () => {
    expect(shouldCall({ pot: 120, call: 30, winProbability: 0.2 })).toBe(true);
    expect(shouldCall({ pot: 120, call: 30, winProbability: 0.19 })).toBe(false);
  });

  it("rejects non-positive pot and call values", () => {
    expect(() => shouldCall({ pot: 0, call: 30, winProbability: 0.2 })).toThrow(
      "Pot must be positive",
    );
    expect(() => shouldCall({ pot: 120, call: 0, winProbability: 0.2 })).toThrow(
      "Call must be positive",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/engine/enumerator.test.ts src/engine/potOdds.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement enumerator and pot odds**

Create `src/engine/enumerator.ts`:

```ts
import { buildDeck, type Card, removeKnownCards } from "./cards";
import {
  compareCategoryToTarget,
  evaluateBestCategory,
  type HandCategory,
} from "./handEvaluator";

export type EnumerateNextCardInput = {
  hero: Card[];
  board: Card[];
  target: HandCategory;
};

export type EnumerationResult = {
  remaining: number;
  win: number;
  push: number;
  miss: number;
  winProbability: number;
};

export function enumerateNextCardOutcomes(
  input: EnumerateNextCardInput,
): EnumerationResult {
  if (input.hero.length !== 2) {
    throw new Error("Hero must have exactly 2 cards");
  }
  if (input.board.length < 3 || input.board.length > 4) {
    throw new Error("Board must have 3 or 4 cards");
  }

  const remainingDeck = removeKnownCards(buildDeck(), [...input.hero, ...input.board]);
  const counts = { win: 0, push: 0, miss: 0 };

  for (const nextCard of remainingDeck) {
    const category = evaluateBestCategory([...input.hero, ...input.board, nextCard]);
    const bucket = compareCategoryToTarget(category, input.target);
    counts[bucket] += 1;
  }

  return {
    remaining: remainingDeck.length,
    win: counts.win,
    push: counts.push,
    miss: counts.miss,
    winProbability: counts.win / remainingDeck.length,
  };
}
```

Create `src/engine/potOdds.ts`:

```ts
export type ShouldCallInput = {
  pot: number;
  call: number;
  winProbability: number;
};

export function requiredEquity(pot: number, call: number): number {
  if (pot <= 0) throw new Error("Pot must be positive");
  if (call <= 0) throw new Error("Call must be positive");
  return call / (pot + call);
}

export function shouldCall(input: ShouldCallInput): boolean {
  return input.winProbability >= requiredEquity(input.pot, input.call);
}
```

- [ ] **Step 4: Run enumeration and pot odds tests**

Run:

```bash
npm test -- src/engine/enumerator.test.ts src/engine/potOdds.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit enumeration**

Run:

```bash
git add src/engine/enumerator.ts src/engine/enumerator.test.ts src/engine/potOdds.ts src/engine/potOdds.test.ts
git commit -m "Add next-card odds enumeration"
```

Expected: commit succeeds.

---

### Task 5: Prompt Types, Hash Routing, and Seeded Randomness

**Files:**
- Create: `src/prompts/types.ts`
- Create: `src/prompts/hashRouter.ts`
- Create: `src/prompts/hashRouter.test.ts`
- Create: `src/prompts/seededRandom.ts`
- Create: `src/prompts/seededRandom.test.ts`

- [ ] **Step 1: Write failing hash and seed tests**

Create `src/prompts/hashRouter.test.ts`:

```ts
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./hashRouter";

describe("hashRouter", () => {
  it("parses odds hashes", () => {
    expect(
      parsePromptHash("#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9"),
    ).toMatchObject({
      mode: "odds",
      hero: [
        { rank: "6", suit: "s" },
        { rank: "7", suit: "s" },
      ],
      target: "two-pair",
      seed: "k4p9",
    });
  });

  it("parses bet hashes", () => {
    expect(
      parsePromptHash("#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9"),
    ).toMatchObject({ mode: "bet", pot: 120, call: 30 });
  });

  it("rejects duplicate cards and invalid board lengths", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s6s&board=8s9dKh&target=two-pair&seed=k4p9"),
    ).toThrow("Duplicate card");
    expect(() =>
      parsePromptHash("#/bet?hero=6s7s&board=8s9dKh&target=trips&pot=120&call=30&seed=k4p9"),
    ).toThrow("Bet mode requires exactly 4 board cards");
  });

  it("round trips and canonicalizes prompts", () => {
    const prompt = parsePromptHash(
      "#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );
    expect(promptToHash(prompt)).toBe(
      "#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );
    expect(canonicalPromptKey(prompt)).toBe(
      "mode=bet&hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );
  });
});
```

Create `src/prompts/seededRandom.test.ts`:

```ts
import { choice, createSeededRandom, shuffle } from "./seededRandom";

describe("seededRandom", () => {
  it("produces stable sequences from the same seed", () => {
    const first = createSeededRandom("k4p9");
    const second = createSeededRandom("k4p9");

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("shuffles and chooses deterministically", () => {
    expect(shuffle([1, 2, 3, 4], "seed-a")).toEqual(shuffle([1, 2, 3, 4], "seed-a"));
    expect(choice(["a", "b", "c"], "seed-b")).toBe(choice(["a", "b", "c"], "seed-b"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/prompts/hashRouter.test.ts src/prompts/seededRandom.test.ts
```

Expected: FAIL because prompt modules do not exist.

- [ ] **Step 3: Implement prompt types**

Create `src/prompts/types.ts`:

```ts
import type { Card } from "../engine/cards";
import type { HandCategory } from "../engine/handEvaluator";

export type PromptMode = "odds" | "bet";

export type BasePrompt = {
  mode: PromptMode;
  hero: Card[];
  board: Card[];
  target: HandCategory;
  seed: string;
};

export type OddsPrompt = BasePrompt & {
  mode: "odds";
};

export type BetPrompt = BasePrompt & {
  mode: "bet";
  pot: number;
  call: number;
};

export type Prompt = OddsPrompt | BetPrompt;
```

- [ ] **Step 4: Implement seeded random**

Create `src/prompts/seededRandom.ts`:

```ts
export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const random = createSeededRandom(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function choice<T>(items: T[], seed: string): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from empty list");
  }
  const random = createSeededRandom(seed);
  return items[Math.floor(random() * items.length)];
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
```

- [ ] **Step 5: Implement hash router**

Create `src/prompts/hashRouter.ts`:

```ts
import { cardToString, parseCardList } from "../engine/cards";
import { HAND_CATEGORIES, type HandCategory } from "../engine/handEvaluator";
import type { Prompt } from "./types";

const targetSet = new Set<string>(HAND_CATEGORIES);

export function parsePromptHash(hash: string): Prompt {
  const [path, queryString = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(queryString);
  const mode = path.replace("/", "");
  const hero = parseCardList(required(params, "hero"));
  const board = parseCardList(required(params, "board"));
  const target = parseTarget(required(params, "target"));
  const seed = required(params, "seed");

  assertNoDuplicateCards([...hero, ...board]);

  if (hero.length !== 2) {
    throw new Error("Prompt requires exactly 2 hero cards");
  }

  if (mode === "odds") {
    if (board.length !== 3 && board.length !== 4) {
      throw new Error("Odds mode requires 3 or 4 board cards");
    }
    return { mode, hero, board, target, seed };
  }

  if (mode === "bet") {
    if (board.length !== 4) {
      throw new Error("Bet mode requires exactly 4 board cards");
    }
    const pot = parsePositiveNumber(required(params, "pot"), "Pot");
    const call = parsePositiveNumber(required(params, "call"), "Call");
    return { mode, hero, board, target, seed, pot, call };
  }

  throw new Error(`Unknown mode: ${mode}`);
}

export function promptToHash(prompt: Prompt): string {
  const base = `#/${prompt.mode}?hero=${cardsToString(prompt.hero)}&board=${cardsToString(
    prompt.board,
  )}&target=${prompt.target}`;
  if (prompt.mode === "bet") {
    return `${base}&pot=${prompt.pot}&call=${prompt.call}&seed=${prompt.seed}`;
  }
  return `${base}&seed=${prompt.seed}`;
}

export function canonicalPromptKey(prompt: Prompt): string {
  const base = `mode=${prompt.mode}&hero=${cardsToString(prompt.hero)}&board=${cardsToString(
    prompt.board,
  )}&target=${prompt.target}`;
  if (prompt.mode === "bet") {
    return `${base}&pot=${prompt.pot}&call=${prompt.call}&seed=${prompt.seed}`;
  }
  return `${base}&seed=${prompt.seed}`;
}

function cardsToString(cards: { rank: string; suit: string }[]): string {
  return cards.map(cardToString).join("");
}

function required(params: URLSearchParams, key: string): string {
  const value = params.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function parseTarget(value: string): HandCategory {
  if (!targetSet.has(value)) throw new Error(`Invalid target: ${value}`);
  return value as HandCategory;
}

function parsePositiveNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be positive`);
  }
  return parsed;
}

function assertNoDuplicateCards(cards: { rank: string; suit: string }[]): void {
  const ids = cards.map(cardToString);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate card");
  }
}
```

- [ ] **Step 6: Run prompt tests**

Run:

```bash
npm test -- src/prompts/hashRouter.test.ts src/prompts/seededRandom.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit hash routing**

Run:

```bash
git add src/prompts
git commit -m "Add deterministic prompt hash routing"
```

Expected: commit succeeds.

---

### Task 6: Prompt Generation and Answer Options

**Files:**
- Create: `src/prompts/questionGenerator.ts`
- Create: `src/prompts/questionGenerator.test.ts`

- [ ] **Step 1: Write failing prompt generator tests**

Create `src/prompts/questionGenerator.test.ts`:

```ts
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { generatePrompt, getAnswerModel } from "./questionGenerator";

describe("questionGenerator", () => {
  it("generates valid odds prompts with compact seed", () => {
    const prompt = generatePrompt("odds", "seed-1");

    expect(prompt.mode).toBe("odds");
    expect(prompt.hero).toHaveLength(2);
    expect([3, 4]).toContain(prompt.board.length);
    expect(prompt.seed).toMatch(/^[a-z0-9]+$/);
  });

  it("generates valid bet prompts with turn board and bet context", () => {
    const prompt = generatePrompt("bet", "seed-2");

    expect(prompt.mode).toBe("bet");
    expect(prompt.board).toHaveLength(4);
    expect(prompt.pot).toBeGreaterThan(0);
    expect(prompt.call).toBeGreaterThan(0);
  });

  it("creates stable odds answer options from the prompt seed", () => {
    const prompt = generatePrompt("odds", "seed-3");
    expect(getAnswerModel(prompt)).toEqual(getAnswerModel(prompt));
    expect(getAnswerModel(prompt).kind).toBe("odds");
  });

  it("matches answer model odds to enumeration", () => {
    const prompt = generatePrompt("odds", "seed-4");
    const result = enumerateNextCardOutcomes(prompt);
    const answer = getAnswerModel(prompt);

    if (answer.kind !== "odds") throw new Error("Expected odds answer model");
    expect(answer.correctProbability).toBe(result.winProbability);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/prompts/questionGenerator.test.ts
```

Expected: FAIL because `questionGenerator.ts` does not exist.

- [ ] **Step 3: Implement prompt generation**

Create `src/prompts/questionGenerator.ts`:

```ts
import { buildDeck, cardToString } from "../engine/cards";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import type { HandCategory } from "../engine/handEvaluator";
import { shouldCall } from "../engine/potOdds";
import { shuffle } from "./seededRandom";
import type { BetPrompt, OddsPrompt, Prompt, PromptMode } from "./types";

const TARGETS: HandCategory[] = ["pair", "two-pair", "trips", "straight", "flush", "full-house"];

export type OddsAnswerModel = {
  kind: "odds";
  correctProbability: number;
  options: number[];
};

export type BetAnswerModel = {
  kind: "bet";
  correctAction: "call" | "fold";
  requiredEquity: number;
};

export type AnswerModel = OddsAnswerModel | BetAnswerModel;

export function generatePrompt(mode: PromptMode, seed = randomSeed()): Prompt {
  const randomCards = shuffle(buildDeck(), `${seed}:cards`);
  const target = shuffle(TARGETS, `${seed}:target`)[0];

  if (mode === "odds") {
    const boardLength = shuffle([3, 4], `${seed}:board-length`)[0];
    return {
      mode,
      hero: randomCards.slice(0, 2),
      board: randomCards.slice(2, 2 + boardLength),
      target,
      seed: normalizeSeed(seed),
    };
  }

  return {
    mode,
    hero: randomCards.slice(0, 2),
    board: randomCards.slice(2, 6),
    target,
    pot: shuffle([60, 80, 100, 120, 160, 200], `${seed}:pot`)[0],
    call: shuffle([10, 20, 30, 40, 50, 60], `${seed}:call`)[0],
    seed: normalizeSeed(seed),
  };
}

export function getAnswerModel(prompt: Prompt): AnswerModel {
  const result = enumerateNextCardOutcomes(prompt);

  if (prompt.mode === "bet") {
    return {
      kind: "bet",
      correctAction: shouldCall({
        pot: prompt.pot,
        call: prompt.call,
        winProbability: result.winProbability,
      })
        ? "call"
        : "fold",
      requiredEquity: prompt.call / (prompt.pot + prompt.call),
    };
  }

  const correct = result.winProbability;
  const offsets = shuffle([-0.12, -0.08, -0.05, 0.05, 0.08, 0.12], `${prompt.seed}:options`);
  const distractors = offsets
    .map((offset) => clampProbability(roundProbability(correct + offset)))
    .filter((value) => value !== roundProbability(correct))
    .slice(0, 2);

  return {
    kind: "odds",
    correctProbability: correct,
    options: shuffle([roundProbability(correct), ...distractors], `${prompt.seed}:order`),
  };
}

export function promptSignature(prompt: OddsPrompt | BetPrompt): string {
  const cards = [...prompt.hero, ...prompt.board].map(cardToString).join("");
  return `${prompt.mode}:${cards}:${prompt.target}:${prompt.seed}`;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

function normalizeSeed(seed: string): string {
  return seed.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || randomSeed();
}

function roundProbability(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}
```

- [ ] **Step 4: Run prompt generator tests**

Run:

```bash
npm test -- src/prompts/questionGenerator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit prompt generator**

Run:

```bash
git add src/prompts/questionGenerator.ts src/prompts/questionGenerator.test.ts
git commit -m "Add seeded poker prompt generator"
```

Expected: commit succeeds.

---

### Task 7: Local Profile Store and Duplicate Scoring Guard

**Files:**
- Create: `src/profile/profileStore.ts`
- Create: `src/profile/profileStore.test.ts`

- [ ] **Step 1: Write failing profile tests**

Create `src/profile/profileStore.test.ts`:

```ts
import { loadProfile, recordAnswer, resetProfile } from "./profileStore";

describe("profileStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a default versioned profile", () => {
    expect(loadProfile()).toMatchObject({
      version: 1,
      modes: {
        tellMeTheOdds: { answered: 0, correct: 0 },
        whatsTheBet: { answered: 0, correct: 0 },
      },
      answeredPrompts: {},
    });
  });

  it("records an answer once per canonical key", () => {
    const key = "mode=odds&hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9";

    const first = recordAnswer({
      key,
      mode: "odds",
      selected: "20%",
      correct: true,
    });
    const second = recordAnswer({
      key,
      mode: "odds",
      selected: "20%",
      correct: true,
    });

    expect(first.scored).toBe(true);
    expect(second.scored).toBe(false);
    expect(second.profile.modes.tellMeTheOdds.answered).toBe(1);
    expect(second.profile.modes.tellMeTheOdds.correct).toBe(1);
  });

  it("can reset profile data", () => {
    recordAnswer({ key: "abc", mode: "bet", selected: "call", correct: false });
    resetProfile();
    expect(loadProfile().modes.whatsTheBet.answered).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/profile/profileStore.test.ts
```

Expected: FAIL because `profileStore.ts` does not exist.

- [ ] **Step 3: Implement profile store**

Create `src/profile/profileStore.ts`:

```ts
import type { PromptMode } from "../prompts/types";

const STORAGE_KEY = "odds.playerProfile.v1";

export type ModeStats = {
  answered: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
};

export type AnsweredPrompt = {
  mode: PromptMode;
  answeredAt: string;
  selected: string;
  correct: boolean;
};

export type PlayerProfile = {
  version: 1;
  modes: {
    tellMeTheOdds: ModeStats;
    whatsTheBet: ModeStats;
  };
  weakSpots: Record<string, { answered: number; correct: number }>;
  answeredPrompts: Record<string, AnsweredPrompt>;
  settings: Record<string, unknown>;
};

export type RecordAnswerInput = {
  key: string;
  mode: PromptMode;
  selected: string;
  correct: boolean;
};

export function loadProfile(): PlayerProfile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultProfile();

  try {
    const parsed = JSON.parse(raw) as PlayerProfile;
    if (parsed.version !== 1) return defaultProfile();
    return parsed;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function recordAnswer(input: RecordAnswerInput): {
  profile: PlayerProfile;
  scored: boolean;
} {
  const profile = loadProfile();

  if (profile.answeredPrompts[input.key]) {
    return { profile, scored: false };
  }

  const modeStats = input.mode === "odds" ? profile.modes.tellMeTheOdds : profile.modes.whatsTheBet;
  modeStats.answered += 1;
  if (input.correct) {
    modeStats.correct += 1;
    modeStats.currentStreak += 1;
    modeStats.bestStreak = Math.max(modeStats.bestStreak, modeStats.currentStreak);
  } else {
    modeStats.currentStreak = 0;
  }

  profile.answeredPrompts[input.key] = {
    mode: input.mode,
    answeredAt: new Date().toISOString(),
    selected: input.selected,
    correct: input.correct,
  };

  saveProfile(profile);
  return { profile, scored: true };
}

export function resetProfile(): void {
  saveProfile(defaultProfile());
}

function defaultProfile(): PlayerProfile {
  return {
    version: 1,
    modes: {
      tellMeTheOdds: createModeStats(),
      whatsTheBet: createModeStats(),
    },
    weakSpots: {},
    answeredPrompts: {},
    settings: {},
  };
}

function createModeStats(): ModeStats {
  return {
    answered: 0,
    correct: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}
```

- [ ] **Step 4: Run profile tests**

Run:

```bash
npm test -- src/profile/profileStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit profile store**

Run:

```bash
git add src/profile/profileStore.ts src/profile/profileStore.test.ts
git commit -m "Add local player profile storage"
```

Expected: commit succeeds.

---

### Task 8: Trainer UI and Prompt Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/CardView.tsx`
- Create: `src/components/TrainerView.tsx`
- Create: `src/components/TrainerView.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `src/components/TrainerView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parsePromptHash } from "../prompts/hashRouter";
import { TrainerView } from "./TrainerView";

describe("TrainerView", () => {
  it("answers an odds prompt and shows feedback", async () => {
    const prompt = parsePromptHash("#/odds?hero=AsKs&board=2s7s9dQc&target=trips&seed=k4p9");
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);
    await userEvent.click(screen.getAllByRole("button", { name: /%/ })[0]);

    expect(screen.getByText(/Remaining cards/i)).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  it("answers a bet prompt with call or fold", async () => {
    const prompt = parsePromptHash(
      "#/bet?hero=AsKs&board=2s7s9dQc&target=trips&pot=120&call=30&seed=k4p9",
    );
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);
    await userEvent.click(screen.getByRole("button", { name: "Call" }));

    expect(screen.getByText(/Required equity/i)).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
npm test -- src/components/TrainerView.test.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement card component**

Create `src/components/CardView.tsx`:

```tsx
import type { Card } from "../engine/cards";

const suitSymbols = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
} as const;

export function CardView({ card }: { card: Card }) {
  const isRed = card.suit === "d" || card.suit === "h";

  return (
    <span className={`card ${isRed ? "card-red" : "card-black"}`} aria-label={`${card.rank}${card.suit}`}>
      <span>{card.rank}</span>
      <span>{suitSymbols[card.suit]}</span>
    </span>
  );
}
```

- [ ] **Step 4: Implement trainer component**

Create `src/components/TrainerView.tsx`:

```tsx
import { useMemo, useState } from "react";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { requiredEquity, shouldCall } from "../engine/potOdds";
import { canonicalPromptKey } from "../prompts/hashRouter";
import { getAnswerModel } from "../prompts/questionGenerator";
import type { Prompt } from "../prompts/types";
import { CardView } from "./CardView";

type Props = {
  prompt: Prompt;
  onNext: () => void;
  onAnswered: (answer: { key: string; selected: string; correct: boolean }) => void;
};

export function TrainerView({ prompt, onNext, onAnswered }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const result = useMemo(() => enumerateNextCardOutcomes(prompt), [prompt]);
  const answerModel = useMemo(() => getAnswerModel(prompt), [prompt]);
  const promptKey = canonicalPromptKey(prompt);

  function answer(value: string, correct: boolean) {
    if (selected) return;
    setSelected(value);
    onAnswered({ key: promptKey, selected: value, correct });
  }

  return (
    <section className="trainer">
      <div className="table-area">
        <div>
          <h2>Your Hand</h2>
          <div className="card-row">{prompt.hero.map((card) => <CardView key={`${card.rank}${card.suit}`} card={card} />)}</div>
        </div>
        <div>
          <h2>Board</h2>
          <div className="card-row">{prompt.board.map((card) => <CardView key={`${card.rank}${card.suit}`} card={card} />)}</div>
        </div>
      </div>

      <div className="question-panel">
        <p className="target">Beat: {prompt.target}</p>
        {prompt.mode === "bet" && (
          <p>
            Pot ${prompt.pot} · Call ${prompt.call}
          </p>
        )}

        {answerModel.kind === "odds" ? (
          <div className="answer-grid">
            {answerModel.options.map((option) => {
              const label = `${Math.round(option * 100)}%`;
              return (
                <button key={label} onClick={() => answer(label, option === Math.round(answerModel.correctProbability * 1000) / 1000)}>
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="answer-grid two">
            <button onClick={() => answer("call", answerModel.correctAction === "call")}>Call</button>
            <button onClick={() => answer("fold", answerModel.correctAction === "fold")}>Fold</button>
          </div>
        )}

        {selected && (
          <div className="feedback">
            <strong>{selected}</strong>
            <p>Win outs: {result.win}</p>
            <p>Pushes: {result.push}</p>
            <p>Remaining cards: {result.remaining}</p>
            <p>Win chance: {Math.round(result.winProbability * 1000) / 10}%</p>
            {prompt.mode === "bet" && <p>Required equity: {Math.round(requiredEquity(prompt.pot, prompt.call) * 1000) / 10}%</p>}
            <p>Pushes are neutral and do not count as wins.</p>
            <button onClick={onNext}>Next</button>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Wire app hash state and profile scoring**

Replace `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { TrainerView } from "./components/TrainerView";
import { parsePromptHash, promptToHash } from "./prompts/hashRouter";
import { generatePrompt } from "./prompts/questionGenerator";
import type { Prompt, PromptMode } from "./prompts/types";
import { loadProfile, recordAnswer } from "./profile/profileStore";

function currentPrompt(): Prompt {
  try {
    return parsePromptHash(window.location.hash);
  } catch {
    const prompt = generatePrompt("odds");
    window.location.replace(promptToHash(prompt));
    return prompt;
  }
}

export function App() {
  const [prompt, setPrompt] = useState<Prompt>(() => currentPrompt());
  const [profile, setProfile] = useState(() => loadProfile());

  useEffect(() => {
    const handleHashChange = () => setPrompt(currentPrompt());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function nextPrompt(mode: PromptMode = prompt.mode) {
    const next = generatePrompt(mode);
    window.location.hash = promptToHash(next);
    setPrompt(next);
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button onClick={() => nextPrompt("odds")}>Tell Me The Odds</button>
        <button onClick={() => nextPrompt("bet")}>What's The Bet</button>
        <span>
          Odds {profile.modes.tellMeTheOdds.correct}/{profile.modes.tellMeTheOdds.answered}
        </span>
        <span>
          Bet {profile.modes.whatsTheBet.correct}/{profile.modes.whatsTheBet.answered}
        </span>
      </header>

      <TrainerView
        prompt={prompt}
        onNext={() => nextPrompt()}
        onAnswered={({ key, selected, correct }) => {
          const result = recordAnswer({ key, mode: prompt.mode, selected, correct });
          setProfile(result.profile);
        }}
      />
    </main>
  );
}
```

- [ ] **Step 6: Replace app styles**

Replace `src/styles.css` with responsive trainer styles:

```css
:root {
  color: #172019;
  background: #f6f3eb;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  min-height: 44px;
  border: 1px solid #193522;
  border-radius: 8px;
  background: #ffffff;
  color: #172019;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.app-shell {
  min-height: 100vh;
  padding: 16px;
}

.top-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0 auto 20px;
  max-width: 960px;
}

.top-bar span {
  margin-left: auto;
  white-space: nowrap;
}

.trainer {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 20px;
  max-width: 960px;
  margin: 0 auto;
}

.table-area,
.question-panel {
  border: 1px solid #d4c8ad;
  border-radius: 8px;
  background: #fffdf7;
  padding: 16px;
}

.card-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.card {
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
  width: 64px;
  height: 88px;
  border: 1px solid #2f382f;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
  font-size: 22px;
  font-weight: 800;
}

.card-red {
  color: #b2272e;
}

.card-black {
  color: #111111;
}

.target {
  font-size: 24px;
  font-weight: 800;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.answer-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.feedback {
  margin-top: 16px;
  border-top: 1px solid #d4c8ad;
  padding-top: 16px;
}

@media (max-width: 720px) {
  .trainer {
    grid-template-columns: 1fr;
  }

  .top-bar span {
    margin-left: 0;
  }
}
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- src/components/TrainerView.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit UI flow**

Run:

```bash
git add src/App.tsx src/styles.css src/components
git commit -m "Build trainer prompt UI"
```

Expected: commit succeeds.

---

### Task 9: End-To-End Verification and Polish

**Files:**
- Modify: any files needed to fix failures found by verification.

- [ ] **Step 1: Run full automated tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript build and Vite production build both succeed.

- [ ] **Step 3: Start dev server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL on `127.0.0.1`.

- [ ] **Step 4: Manually verify in browser**

Open the local URL and verify:

- Loading without a hash replaces the URL with a valid `#/odds?...` hash.
- Answering a prompt does not change the URL.
- Clicking Next changes the URL.
- Reloading the same URL keeps the same answer choices.
- Re-answering a previously answered URL does not increase aggregate stats.
- Switching to What's The Bet creates a `#/bet?...` hash with 4 board cards, pot, call, and seed.
- Mobile-width layout stacks cleanly and no text overlaps.

- [ ] **Step 5: Commit verification fixes**

If verification required fixes, run:

```bash
git add src package.json package-lock.json README.md
git commit -m "Polish poker odds trainer verification"
```

Expected: commit succeeds if there were changes. If there were no changes, skip this commit.

---

## Self-Review Notes

Spec coverage:

- Browser-only Vite + React + TypeScript app: Task 1.
- Exact deck enumeration: Tasks 2, 3, and 4.
- Generic target ranks and push handling: Tasks 3 and 4.
- Tell Me The Odds and What's The Bet: Tasks 6 and 8.
- Hash URL state and compact card encoding: Task 5.
- Seeded prompt presentation: Tasks 5 and 6.
- LocalStorage JSON profile and duplicate scoring guard: Task 7.
- Responsive trainer-first UX: Task 8.
- Verification and manual checks: Task 9.

The plan intentionally keeps v1 to single-next-card enumeration and generic hand-rank category comparisons, matching the approved design.
