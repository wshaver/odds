# Chase Out Mode Design

## Purpose

Add a third training mode, Chase Out, that teaches value-sized betting against Biff's exact hand. The player should find the smallest whole-dollar bet that makes Biff's call mathematically wrong, not the largest bet that would obviously force a fold.

The mode trains this idea:

- If Biff can correctly call `$4` but cannot correctly call `$5`, then `$5` is the correct answer.
- `$10` may also make the call wrong, but it is not the target answer because the trainer is practicing tempting bad calls.

Pushes remain neutral. They are reported in feedback but do not count toward Biff's equity.

## Prompt Model

Chase Out reuses the visible heads-up prompt shape:

- `mode`: `chase`.
- `hero`: exactly two player cards.
- `opponent`: exactly two Biff cards.
- `board`: exactly four community cards.
- `pot`: positive whole-dollar pot before the player's bet.
- `seed`: compact presentation seed.

The prompt does not need a `call` field because the player is choosing the bet size. The selected answer is a proposed bet amount.

The board is always four cards because the drill is about Biff calling one bet to see the river.

## Core Math

Chase Out computes Biff's river equity by enumerating every legal river card from the existing deck engine. For each candidate river, evaluate:

```text
Biff hand + board + river
Hero hand + board + river
```

Classify the candidate from Biff's perspective:

- `biffWin`: Biff's best hand is strictly stronger.
- `push`: both best hands are exactly tied.
- `biffMiss`: Hero's best hand is strictly stronger.

Biff's call equity is:

```text
biffWinProbability = biffWins / remainingCards
```

Pushes are neutral and are excluded from the numerator.

Biff's highest mathematically correct whole-dollar call is:

```text
highestCorrectCall = floor((biffWinProbability * pot) / (1 - biffWinProbability))
```

The correct Chase Out answer is:

```text
correctChaseOutBet = highestCorrectCall + 1
```

A proposed bet is a bad call for Biff when:

```text
biffWinProbability < bet / (pot + bet)
```

The strict comparison matters. If Biff's win probability exactly equals the required equity, the call is still mathematically acceptable, matching the existing `shouldCall` threshold behavior.

## Prompt Generation

The generator deals from one shuffled 52-card deck:

1. Player hand: first two cards.
2. Biff hand: next two cards.
3. Board: next four cards.

It also generates a positive whole-dollar pot. The pot should be chosen so generated Chase Out answers usually land in a compact, readable range for buttons and feedback.

Generated prompts from the `Next` button must avoid unhelpful cases. Accept a generated prompt only when:

```text
biffWinProbability > 0
biffWinProbability < 1
correctChaseOutBet > 1
```

This excludes:

- Hands where no finite bet can chase Biff out because Biff wins on every remaining river.
- Hands where Biff would already fold to a minimum `$1` bet.
- Hands with no meaningful Biff equity to reason about.

Use the existing bounded retry pattern, but do not emit generated Chase Out prompts that violate those usefulness constraints. If random retries fail, the generator should advance to another deterministic seed attempt or use a small tested fixture pool until it can return a useful prompt. Shared or manually loaded hash prompts may still be parsed and displayed if structurally valid, but prompts created by the `Next` button must be trainer-friendly.

## Answer Options

Each Chase Out prompt shows exactly three multiple-choice answers:

- The correct whole-dollar Chase Out bet.
- Two unique positive whole-dollar distractors near the correct amount.
- All labels are formatted as dollar amounts, such as `$5`.

Distractors should be above or below the correct amount by a small seeded factor. They should feel close enough that the player must reason about the threshold instead of picking an obviously oversized bet.

The correct answer must not always be bracketed. Seeded option generation should vary the pattern so the correct amount is sometimes:

- The lowest displayed amount.
- The middle displayed amount.
- The highest displayed amount.

Examples for a correct answer of `$5`:

```text
$3, $4, $5
$4, $5, $6
$5, $6, $8
```

Choice order should also be seeded and reproducible from the prompt seed. Reloading the same hash should produce the same option amounts and order.

## User Interface

The top mode navigation adds a third option labeled `Chase`.

The table shows:

- Biff's two cards.
- The four-card board.
- The player's two cards.
- The current pot.

The question text should be concise:

```text
What bet chases Biff out?
```

The mode should keep the existing answer flow:

1. Show the poker situation.
2. Player chooses one of three dollar amounts.
3. Lock the answer.
4. Show feedback.
5. Player advances to the next generated Chase Out prompt.

## Feedback

After answering, show:

- Correct or incorrect.
- Biff win outs.
- Pushes.
- Remaining river cards.
- Biff win chance.
- Highest mathematically correct call.
- Lowest Chase Out bet.

Feedback should make the sizing goal explicit without adding long instructional text. The key distinction is that larger bets may also be bad calls for Biff, but only the lowest bad-call bet is correct.

## Hash URL State

Chase Out uses its own route:

```text
#/chase?hero=AsJs&opponent=TcTd&board=Ah7c2d9s&pot=120&seed=k4p9
```

Validation must require:

- Mode path is `chase`.
- Exactly two hero cards.
- Exactly two opponent cards.
- Exactly four board cards.
- No duplicate cards across hero, opponent, and board.
- Positive whole-dollar pot.
- Non-empty seed.

Canonical prompt keys include mode, hero, opponent, board, pot, and seed. A same visible situation with a different seed remains a different scored prompt because answer presentation is seeded.

## Profile Stats

The local profile adds a third mode stats bucket for Chase Out. Existing stored profiles should normalize missing Chase Out stats to zeroed defaults.

Answered prompt records continue to store:

- Mode.
- Answer timestamp.
- Selected label.
- Correct boolean.

The duplicate-scoring rule remains unchanged: the same canonical prompt key can restore feedback but must not update aggregate stats twice.

## Engine and Helper Boundaries

The existing card and hand engine should remain framework-independent. Chase Out can be implemented with small reusable helpers:

- A Biff-perspective enumeration helper, or a generic enumeration helper that accepts the point-of-view hand.
- A pot-odds helper that returns the highest correct whole-dollar call from a pot and win probability.
- A Chase Out answer helper that returns `highestCorrectCall + 1`.

The implementation should avoid duplicating hand comparison logic in React components. Components should receive an answer model and display derived values.

## Testing Strategy

Engine and math tests should cover:

- Biff-perspective enumeration counts Biff wins, pushes, misses, and remaining cards correctly.
- Pushes are excluded from Biff's win probability.
- `biffWinProbability = 1` is treated as no finite chase-out bet.
- `biffWinProbability = 0` is rejected for generated prompts.
- Exact threshold equality remains a correct call for Biff.
- The smallest bad-call dollar amount is `highestCorrectCall + 1`.

Prompt generation tests should cover:

- Generated Chase Out prompts have exactly two hero cards, two opponent cards, four board cards, no duplicates, a positive pot, and a seed.
- Generated prompts avoid `biffWinProbability <= 0`.
- Generated prompts avoid `biffWinProbability >= 1`.
- Generated prompts avoid `correctChaseOutBet <= 1`.
- The bounded retry fallback still returns a useful Chase Out prompt.

Answer option tests should cover:

- Exactly three options are produced.
- The correct option is included.
- Options are unique positive whole-dollar amounts.
- Same seed produces the same options and order.
- Different seeds can place the correct answer lowest, middle, or highest.

Hash tests should cover:

- `#/chase` parses and canonicalizes.
- Chase Out rejects duplicate cards.
- Chase Out rejects non-positive or non-whole-dollar pots.
- Chase Out rejects board lengths other than four.

Profile tests should cover:

- Loading an old profile adds zeroed Chase Out stats.
- Recording a Chase Out answer updates only Chase Out stats.
- Re-answering the same canonical Chase Out prompt does not score twice.

UI tests should cover:

- Chase mode appears in navigation.
- The prompt renders Biff cards, board, hero cards, pot, and three dollar answer buttons.
- Answering locks choices and shows Biff-specific feedback.
- The `Next` button generates another Chase Out prompt.

## Out Of Scope

- Opponent ranges.
- Multi-opponent pots.
- Bluffing, implied odds, or future betting after the river.
- Half-credit equity for pushes.
- Free-form numeric input.
- Choosing intentionally oversized bets as correct answers.
