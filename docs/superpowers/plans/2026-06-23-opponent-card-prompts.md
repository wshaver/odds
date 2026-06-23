# Opponent Card Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic target-hand prompts with visible two-card opponent hands and calculate odds by comparing full heads-up poker hands.

**Architecture:** Add full hand scoring to the framework-independent poker engine, then update enumeration to compare hero versus opponent for each next-card candidate. Prompt generation, hash state, answer identity, and UI will all carry `opponent` cards instead of `target`.

**Tech Stack:** TypeScript, React, Vite, Vitest, Testing Library.

---

## File Structure

- Modify `src/prompts/types.ts`: add `opponent: Card[]` to base prompts and remove `target`.
- Modify `src/engine/handEvaluator.ts`: replace category-only comparison helpers with ranked hand scoring while keeping `evaluateBestCategory` and `HAND_CATEGORIES` available for existing recognition tests.
- Modify `src/engine/handEvaluator.test.ts`: add full hand comparison tests for pair rank, kickers, and board ties.
- Modify `src/engine/enumerator.ts`: require opponent cards, remove all known cards, compare full hero and opponent hands.
- Modify `src/engine/enumerator.test.ts`: replace target-based examples with opponent-card examples.
- Modify `src/prompts/hashRouter.ts`: parse, serialize, and canonicalize `opponent`; reject legacy target-only hashes through the existing invalid-hash path.
- Modify `src/prompts/hashRouter.test.ts`: update route examples and validation tests.
- Modify `src/prompts/questionGenerator.ts`: deal opponent cards from the shuffled deck and stop selecting generic targets.
- Modify `src/prompts/questionGenerator.test.ts`: assert generated prompts include opponent cards and no duplicates.
- Modify `src/components/TrainerView.tsx`: render the opponent cards row and remove the hand-rank label.
- Modify `src/components/TrainerView.test.tsx`: assert opponent cards render and the generic target label does not.
- Modify `scripts/generate-common-win-chance-options.ts` if TypeScript errors show it still constructs target-based prompts.

---

### Task 1: Ranked Hand Comparison

**Files:**
- Modify: `src/engine/handEvaluator.ts`
- Test: `src/engine/handEvaluator.test.ts`

- [ ] **Step 1: Write failing ranked comparison tests**

Add these imports in `src/engine/handEvaluator.test.ts`:

```ts
import {
  compareBestHands,
  compareCategoryToTarget,
  evaluateBestCategory,
  HAND_CATEGORIES,
} from "./handEvaluator";
```

Add this test block after the `evaluateBestCategory` block:

```ts
describe("compareBestHands", () => {
  it("uses pair rank before kickers", () => {
    expect(
      compareBestHands(parseCardList("JsJdAh9c7s2d3c"), parseCardList("TsTdAh9c7s2d3c")),
    ).toBeGreaterThan(0);

    expect(
      compareBestHands(parseCardList("8s8dAh9c7s2d3c"), parseCardList("TsTdAh9c7s2d3c")),
    ).toBeLessThan(0);
  });

  it("uses kickers within the same category", () => {
    expect(
      compareBestHands(parseCardList("AsAdKh9c7s2d3c"), parseCardList("AsAdQh9c7s2d3c")),
    ).toBeGreaterThan(0);
  });

  it("returns zero for exact shared-board ties", () => {
    expect(
      compareBestHands(parseCardList("AsKdAhKhQhJhTh"), parseCardList("2c3dAhKhQhJhTh")),
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/engine/handEvaluator.test.ts
```

Expected: FAIL because `compareBestHands` is not exported.

- [ ] **Step 3: Implement ranked hand comparison**

In `src/engine/handEvaluator.ts`, add these exports and helpers below `compareCategories`:

```ts
export type HandScore = {
  category: HandCategory;
  ranks: number[];
};

type RankGroup = {
  rank: Rank;
  value: number;
  count: number;
};

export function compareBestHands(left: Card[], right: Card[]): number {
  return compareHandScores(evaluateBestHand(left), evaluateBestHand(right));
}

export function evaluateBestHand(cards: Card[]): HandScore {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  let best: HandScore | null = null;
  for (const hand of fiveCardCombinations(cards)) {
    const score = evaluateFiveCardHand(hand);
    if (best === null || compareHandScores(score, best) > 0) {
      best = score;
    }
  }

  if (best === null) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  return best;
}

export function compareHandScores(left: HandScore, right: HandScore): number {
  const categoryComparison = compareCategories(left.category, right.category);
  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const length = Math.max(left.ranks.length, right.ranks.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left.ranks[index] ?? 0) - (right.ranks[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function evaluateFiveCardHand(cards: Card[]): HandScore {
  const flush = hasFlush(cards);
  const straightHigh = straightHighValue(cards.map((card) => card.rank));
  const groups = rankGroups(cards);
  const counts = groups.map((group) => group.count).sort((a, b) => b - a);

  if (flush && straightHigh !== null) {
    return { category: "straight-flush", ranks: [straightHigh] };
  }

  const four = groups.find((group) => group.count === 4);
  if (four !== undefined) {
    return {
      category: "four-kind",
      ranks: [four.value, ...groups.filter((group) => group.count !== 4).map((group) => group.value)],
    };
  }

  if (hasFullHouse(counts)) {
    const trips = groups.filter((group) => group.count >= 3);
    const pairs = groups.filter((group) => group.count >= 2 && group.value !== trips[0].value);
    return { category: "full-house", ranks: [trips[0].value, pairs[0].value] };
  }

  if (flush) {
    return { category: "flush", ranks: groups.map((group) => group.value) };
  }

  if (straightHigh !== null) {
    return { category: "straight", ranks: [straightHigh] };
  }

  const trips = groups.find((group) => group.count === 3);
  if (trips !== undefined) {
    return {
      category: "trips",
      ranks: [trips.value, ...groups.filter((group) => group.count !== 3).map((group) => group.value)],
    };
  }

  const pairs = groups.filter((group) => group.count === 2);
  if (pairs.length >= 2) {
    const kickers = groups.filter((group) => group.count === 1);
    return { category: "two-pair", ranks: [pairs[0].value, pairs[1].value, kickers[0].value] };
  }

  if (pairs.length === 1) {
    return {
      category: "pair",
      ranks: [pairs[0].value, ...groups.filter((group) => group.count === 1).map((group) => group.value)],
    };
  }

  return { category: "high-card", ranks: groups.map((group) => group.value) };
}

function fiveCardCombinations(cards: Card[]): Card[][] {
  const combinations: Card[][] = [];
  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            combinations.push([cards[first], cards[second], cards[third], cards[fourth], cards[fifth]]);
          }
        }
      }
    }
  }
  return combinations;
}

function rankGroups(cards: Card[]): RankGroup[] {
  const counts = countBy(cards.map((card) => card.rank));
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, value: RANK_VALUES[rank], count }))
    .sort((left, right) => right.count - left.count || right.value - left.value);
}

function straightHighValue(ranks: Rank[]): number | null {
  const values = new Set<number>();
  for (const rank of ranks) {
    const value = RANK_VALUES[rank];
    values.add(value);
    if (rank === "A") {
      values.add(1);
    }
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  let runLength = 1;
  let best: number | null = null;
  for (let index = 1; index < sortedValues.length; index += 1) {
    if (sortedValues[index] === sortedValues[index - 1] + 1) {
      runLength += 1;
      if (runLength >= 5) {
        best = sortedValues[index];
      }
    } else {
      runLength = 1;
    }
  }

  return best;
}
```

Then change `evaluateBestCategory` to:

```ts
export function evaluateBestCategory(cards: Card[]): HandCategory {
  return evaluateBestHand(cards).category;
}
```

Change `hasStraight` to use the new straight helper:

```ts
function hasStraight(ranks: Rank[]): boolean {
  return straightHighValue(ranks) !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/engine/handEvaluator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/handEvaluator.ts src/engine/handEvaluator.test.ts
git commit -m "Add full hand comparison"
```

---

### Task 2: Opponent-Based Enumeration

**Files:**
- Modify: `src/engine/enumerator.ts`
- Test: `src/engine/enumerator.test.ts`

- [ ] **Step 1: Write failing enumerator tests**

Replace `src/engine/enumerator.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { parseCardList } from "./cards";
import { enumerateNextCardOutcomes } from "./enumerator";

describe("enumerateNextCardOutcomes", () => {
  it("removes opponent cards from possible next cards", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("6s7s"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("8s9dKh2s"),
    });

    expect(result.remaining).toBe(44);
  });

  it("counts only cards that beat the opponent's exact pair rank", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("Js8d"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("2s3d4h9c"),
    });

    expect(result.winningCards).toEqual(parseCardList("JcJdJh"));
    expect(result.win).toBe(3);
    expect(result.push).toBe(0);
    expect(result.miss).toBe(41);
    expect(result.winProbability).toBe(3 / 44);
  });

  it("does not count weaker pairs as wins against the opponent", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("8s7d"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("2s3d4h9c"),
    });

    expect(result.winningCards).not.toContainEqual(parseCardList("8c")[0]);
    expect(result.winningCards).not.toContainEqual(parseCardList("7c")[0]);
  });

  it("classifies shared-board made hands as pushes", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKd"),
      opponent: parseCardList("QcJd"),
      board: parseCardList("2c2h3s2s"),
    });

    expect(result.winningCards).not.toContainEqual(parseCardList("2d")[0]);
    expect(result.push).toBeGreaterThan(0);
  });

  it("requires exactly two hero cards", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("As"),
        opponent: parseCardList("TdTc"),
        board: parseCardList("2s7s9d"),
      }),
    ).toThrow("Hero must have exactly 2 cards");
  });

  it("requires exactly two opponent cards", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("AsKs"),
        opponent: parseCardList("Td"),
        board: parseCardList("2s7s9d"),
      }),
    ).toThrow("Opponent must have exactly 2 cards");
  });

  it("requires flop or turn board size", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("AsKs"),
        opponent: parseCardList("TdTc"),
        board: parseCardList("2s7s"),
      }),
    ).toThrow("Board must have 3 or 4 cards");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/engine/enumerator.test.ts
```

Expected: FAIL with TypeScript errors because `opponent` is not part of `EnumerateNextCardInput`.

- [ ] **Step 3: Implement opponent-based enumeration**

Replace `src/engine/enumerator.ts` with:

```ts
import { buildDeck, removeKnownCards, type Card } from "./cards";
import { compareBestHands } from "./handEvaluator";

export type EnumerateNextCardInput = {
  hero: Card[];
  opponent: Card[];
  board: Card[];
};

export type EnumerationResult = {
  remaining: number;
  win: number;
  push: number;
  miss: number;
  winProbability: number;
  winningCards: Card[];
};

export function enumerateNextCardOutcomes(input: EnumerateNextCardInput): EnumerationResult {
  if (input.hero.length !== 2) {
    throw new Error("Hero must have exactly 2 cards");
  }
  if (input.opponent.length !== 2) {
    throw new Error("Opponent must have exactly 2 cards");
  }
  if (input.board.length !== 3 && input.board.length !== 4) {
    throw new Error("Board must have 3 or 4 cards");
  }

  const knownCards = [...input.hero, ...input.opponent, ...input.board];
  const nextCards = removeKnownCards(buildDeck(), knownCards);
  const result: EnumerationResult = {
    remaining: nextCards.length,
    win: 0,
    push: 0,
    miss: 0,
    winProbability: 0,
    winningCards: [],
  };

  for (const nextCard of nextCards) {
    const board = [...input.board, nextCard];
    const comparison = compareBestHands([...input.hero, ...board], [...input.opponent, ...board]);
    if (comparison > 0) {
      result.win += 1;
      result.winningCards.push(nextCard);
    } else if (comparison === 0) {
      result.push += 1;
    } else {
      result.miss += 1;
    }
  }

  result.winProbability = result.win / result.remaining;
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/engine/enumerator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/enumerator.ts src/engine/enumerator.test.ts
git commit -m "Compare odds against opponent cards"
```

---

### Task 3: Prompt Types, Generation, and Hash State

**Files:**
- Modify: `src/prompts/types.ts`
- Modify: `src/prompts/questionGenerator.ts`
- Modify: `src/prompts/questionGenerator.test.ts`
- Modify: `src/prompts/hashRouter.ts`
- Modify: `src/prompts/hashRouter.test.ts`

- [ ] **Step 1: Update failing prompt and route tests**

In `src/prompts/questionGenerator.test.ts`, remove `USEFUL_TARGETS`. Change `cardIds` to:

```ts
function cardIds(prompt: ReturnType<typeof generatePrompt>): string[] {
  return [...prompt.hero, ...prompt.opponent, ...prompt.board].map(cardToString);
}
```

In the odds prompt test, replace the target assertion with:

```ts
expect(prompt.opponent).toHaveLength(2);
```

In the bet prompt test, replace the target assertion with:

```ts
expect(prompt.opponent).toHaveLength(2);
```

Replace `src/prompts/hashRouter.test.ts` route examples so the first parse test uses:

```ts
const prompt = parsePromptHash(
  "#/odds?hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
);

expect(prompt.mode).toBe("odds");
expect(prompt.hero.map(cardToString)).toEqual(["6s", "7s"]);
expect(prompt.opponent.map(cardToString)).toEqual(["Td", "Tc"]);
expect(prompt.board.map(cardToString)).toEqual(["8s", "9d", "Kh"]);
expect(prompt.seed).toBe("k4p9");
```

Use this bet parse hash:

```ts
"#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9"
```

Update duplicate card and invalid board hashes to include `opponent=TdTc` and omit `target`.

Update the round-trip test to expect:

```ts
const hash = "#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9";
expect(promptToHash(prompt)).toBe(hash);
expect(canonicalPromptKey(prompt)).toBe(
  "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9",
);
```

Add this legacy rejection test:

```ts
test("rejects legacy target-only hashes", () => {
  expect(() =>
    parsePromptHash("#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9"),
  ).toThrow(/Missing opponent/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/prompts/questionGenerator.test.ts src/prompts/hashRouter.test.ts
```

Expected: FAIL because prompt types and hash parsing still require `target`.

- [ ] **Step 3: Update prompt types**

Replace `src/prompts/types.ts` with:

```ts
import type { Card } from "../engine/cards";

export type PromptMode = "odds" | "bet";

export type BasePrompt = {
  mode: PromptMode;
  hero: Card[];
  opponent: Card[];
  board: Card[];
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

- [ ] **Step 4: Update prompt generation**

In `src/prompts/questionGenerator.ts`, remove the `HandCategory` import and delete `USEFUL_TARGETS`.

In `buildPrompt`, replace the deal logic with:

```ts
const cards = shuffle(buildDeck(), `${compactSeed}:cards`);
const hero = cards.slice(0, 2);
const opponent = cards.slice(2, 4);
const boardLength = mode === "bet" || random() < 0.5 ? 4 : 3;
const board = cards.slice(4, 4 + boardLength);
```

Return odds prompts with:

```ts
return {
  mode,
  hero,
  opponent,
  board,
  seed: compactSeed,
} satisfies OddsPrompt;
```

Return bet prompts with:

```ts
return {
  mode,
  hero,
  opponent,
  board,
  pot,
  call,
  seed: compactSeed,
} satisfies BetPrompt;
```

Update `promptSignature` to:

```ts
export function promptSignature(prompt: Prompt): string {
  const cards = [...prompt.hero, ...prompt.opponent, ...prompt.board]
    .map((card) => `${card.rank}${card.suit}`)
    .join("");

  if (prompt.mode === "odds") {
    return `odds:${cards}:${prompt.seed}`;
  }

  return `bet:${cards}:${prompt.pot}:${prompt.call}:${prompt.seed}`;
}
```

- [ ] **Step 5: Update hash routing**

In `src/prompts/hashRouter.ts`, remove `HAND_CATEGORIES` and `HandCategory` imports. Parse opponent after hero:

```ts
const opponent = parseCards(requireParam(params, "opponent"), "opponent");
```

Validate:

```ts
validateHero(hero);
validateOpponent(opponent);
validateBoard(mode, board);
validateNoDuplicateCards([...hero, ...opponent, ...board]);
```

Return odds prompt:

```ts
return { mode, hero, opponent, board, seed } satisfies OddsPrompt;
```

Return bet prompt:

```ts
return {
  mode,
  hero,
  opponent,
  board,
  pot: parsePositiveNumber(requireParam(params, "pot"), "Pot"),
  call: parsePositiveNumber(requireParam(params, "call"), "Call"),
  seed,
} satisfies BetPrompt;
```

Update odds serialization entries:

```ts
["hero", cardsToString(prompt.hero)],
["opponent", cardsToString(prompt.opponent)],
["board", cardsToString(prompt.board)],
["seed", prompt.seed],
```

Update bet serialization entries:

```ts
["hero", cardsToString(prompt.hero)],
["opponent", cardsToString(prompt.opponent)],
["board", cardsToString(prompt.board)],
["pot", String(prompt.pot)],
["call", String(prompt.call)],
["seed", prompt.seed],
```

Update canonical key entries the same way, with `mode` first.

Update `knownParamsForMode`:

```ts
function knownParamsForMode(mode: PromptMode): string[] {
  if (mode === "odds") {
    return ["hero", "opponent", "board", "seed"];
  }

  return ["hero", "opponent", "board", "pot", "call", "seed"];
}
```

Delete `parseTarget`. Add:

```ts
function validateOpponent(opponent: Card[]): void {
  if (opponent.length !== 2) {
    throw new Error("Prompt requires exactly 2 opponent cards");
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- src/prompts/questionGenerator.test.ts src/prompts/hashRouter.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/prompts/types.ts src/prompts/questionGenerator.ts src/prompts/questionGenerator.test.ts src/prompts/hashRouter.ts src/prompts/hashRouter.test.ts
git commit -m "Generate prompts with opponent cards"
```

---

### Task 4: Trainer UI

**Files:**
- Modify: `src/components/TrainerView.tsx`
- Modify: `src/components/TrainerView.test.tsx`

- [ ] **Step 1: Write failing UI tests**

In `src/components/TrainerView.test.tsx`, rename the layout test to:

```ts
test("orders board, opponent hand, and player hand on the left", () => {
```

Replace its assertions with:

```ts
const board = screen.getByText("Board");
const opponent = screen.getByText("Opponent hand");
const player = screen.getByText("Player hand");

expect(board.compareDocumentPosition(opponent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
expect(opponent.compareDocumentPosition(player) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
expect(screen.queryByText(/Pair|Two Pair|Trips|Straight|Flush|Full House/i)).not.toBeInTheDocument();
```

In the no-winning-cards test, replace the prompt with:

```ts
const prompt: Prompt = {
  mode: "odds",
  hero: parseCardList("9c7d"),
  opponent: parseCardList("AsAd"),
  board: parseCardList("2c2h3s2s"),
  seed: "TrainerNoWinningCards",
};
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/components/TrainerView.test.tsx
```

Expected: FAIL because the UI still renders the target line and no opponent card row.

- [ ] **Step 3: Update TrainerView card rows**

In `src/components/TrainerView.tsx`, replace this block:

```tsx
<div className="target-line">
  <span className="section-label">Opponent hand</span>
  <strong>{formatHandRank(prompt.target)}</strong>
</div>
<CardRow label="Board" cards={prompt.board} />
<CardRow label="Player hand" cards={prompt.hero} />
```

with:

```tsx
<CardRow label="Board" cards={prompt.board} />
<CardRow label="Opponent hand" cards={prompt.opponent} />
<CardRow label="Player hand" cards={prompt.hero} />
```

Delete `formatHandRank` if TypeScript reports it is unused.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/components/TrainerView.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TrainerView.tsx src/components/TrainerView.test.tsx
git commit -m "Show opponent cards in trainer"
```

---

### Task 5: App-Wide Type Cleanup and Verification

**Files:**
- Modify: `scripts/generate-common-win-chance-options.ts` only if it constructs prompt objects without `opponent`.
- Modify: any TypeScript file reported by the build that still references `target`.

- [ ] **Step 1: Run target reference scan**

Run:

```bash
rg "target|compareCategoryToTarget|EnumerateNextCardInput" src scripts
```

Expected: no prompt gameplay references to `target`. `compareCategoryToTarget` may remain only if tests still cover the legacy helper; remove it if TypeScript reports it is unused and no tests need it.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS with TypeScript compilation and Vite build complete.

- [ ] **Step 4: Commit cleanup**

If Step 1, Step 2, or Step 3 required code changes, commit them:

```bash
git add src scripts
git commit -m "Finish opponent card prompt migration"
```

If no code changes were required after Task 4, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers prompt model, generation, opponent-card deck removal, full hand comparison, UI display, hash state, answer identity, and testing.
- Placeholder scan: No task contains placeholder implementation text. Each code-changing task includes exact code snippets and verification commands.
- Type consistency: The plan consistently uses `opponent: Card[]`, `compareBestHands`, and target-free prompt hashes.
