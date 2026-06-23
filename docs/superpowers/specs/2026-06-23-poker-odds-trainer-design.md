# Poker Odds Trainer Design

## Purpose

Build a browser-only poker training app that helps a single player memorize poker odds and practice basic betting choices. The app is not a full poker table simulator. It is a fast quiz trainer focused on exact odds from visible cards.

The first version supports two play modes:

- Tell Me The Odds: choose the correct probability that the next card lets the player beat a stated target hand rank.
- What's The Bet: decide whether calling a bet is mathematically correct from pot odds and the chance that the river card beats a stated target hand rank.

Future modes should reuse the same poker engine, URL state, and player profile storage.

## Platform

The app targets modern Chrome and Safari on Android, iOS, and desktop. No legacy browser support is required.

Recommended stack:

- Vite
- TypeScript
- React
- Vitest

The poker engine should be framework-independent TypeScript. Third-party libraries such as Lodash are acceptable when they save real implementation time, but the core app should stay dependency-light.

## Core Rules

The app uses exact enumeration from an actual 52-card deck.

Known cards are:

- The player's two hole cards.
- The visible board cards.

Generic target hands such as two pair, trips, straight, or flush do not remove any imagined opponent cards from the deck. The target is only a hand-strength threshold.

When evaluating "chance to beat" a target:

- Wins are outcomes where the player's final hand is strictly stronger than the target.
- Pushes are outcomes where the player's final hand has the same hand-rank category as the generic target and are neutral.
- Misses are outcomes that do not beat the target.

Quiz correctness for "chance to beat" uses wins only. Pushes should be reported in feedback but excluded from win probability.

Because v1 targets are generic hand ranks, comparison is by hand-rank category only. For example, if the target is trips, any player outcome that is also trips is a push, regardless of the trip rank or kickers. Full house or better beats trips. Two pair or worse misses.

## Core Model

The app should have a small poker engine independent of the UI and play modes.

Core units:

- Card: rank plus suit.
- Deck: standard 52-card deck with known cards removed.
- HandEvaluator: scores the best 5-card poker hand from 5 to 7 available cards.
- Enumerator: tests legal future cards and buckets outcomes as win, push, or miss.
- QuestionGenerator: creates valid quiz prompts, including hero cards, board cards, target rank, bet context, and multiple-choice options.
- HashRouter: parses, validates, canonicalizes, and writes hash URL state.
- PlayerProfileStore: reads and writes one JSON blob in localStorage.

For v1, both modes use single-next-card enumeration.

## Play Modes

### Tell Me The Odds

The app shows:

- The player's two-card hand.
- A visible board of 3 or 4 cards.
- A generic target hand rank to beat.

The app asks for the probability that the next card lets the player beat the target. The player chooses from three probability options.

After answering, the app shows:

- Correct or incorrect.
- Exact win percentage.
- Win outs count.
- Push count, if any.
- Remaining card count.
- A short explanation that pushes are neutral and excluded from the win probability.

### What's The Bet

The app shows:

- The player's two-card hand.
- Exactly 4 visible board cards.
- A generic target hand rank to beat.
- Current pot.
- Call amount.

The app asks whether calling is mathematically correct based only on the chance that the river card beats the target.

The required equity is:

```text
call / (pot + call)
```

The correct answer is Call when:

```text
winProbability >= requiredEquity
```

Otherwise the correct answer is Fold.

Mode 2 does not account for implied odds, opponent ranges, bluffing, or future betting. It is a pot-odds drill.

## User Experience

The first screen should be the trainer itself, not a landing page.

A compact top bar should allow switching between modes and showing session stats. The main area should focus on the current hand, board, target hand rank, and question.

Each prompt follows this flow:

1. Show the poker situation.
2. Player answers with either three odds choices or Call/Fold.
3. Lock the answer.
4. Show feedback.
5. Player advances to the next generated prompt.

Answering a prompt must not change the URL. Advancing to the next prompt must change the URL.

## Hash URL State

Each prompt is represented by a deterministic hash URL. This makes specific hands shareable.

Use compact card encoding:

- Ranks: 2 3 4 5 6 7 8 9 T J Q K A
- Suits: c d h s
- Card examples: Qs, 7h, Tc
- Card-list examples: 6s7s, 8s9dKh2s

Route examples:

```text
#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9
#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9
```

Hash fields:

- mode path: odds or bet
- hero: exactly 2 cards
- board: 3 or 4 cards for odds mode, exactly 4 cards for bet mode
- target: generic hand rank
- seed: compact random seed
- pot: positive number, bet mode only
- call: positive number, bet mode only

On load or hash change:

1. Parse hash fields.
2. Validate mode, card syntax, duplicate cards, board length, target, pot, and call.
3. If valid, compute odds and render the prompt.
4. If invalid or missing, generate a new valid prompt and replace the hash.

The URL is the source of truth for the current prompt situation.

## Seeded Randomization

The seed is part of the hash URL and controls presentation randomness.

The seed determines:

- Answer choice order.
- Distractor choices.
- Question wording variant.

The seed does not affect the underlying poker odds. Odds depend only on the cards, board, target, and bet context.

Reloading the same URL must reproduce the same presented prompt. Sharing the same URL gives another player the same hand and same answer-choice presentation.

## Local Player Profile

All player data is stored in one localStorage JSON blob. The blob should be shaped so it can later be synced as a server-side JSON blob with minimal changes.

Example shape:

```json
{
  "version": 1,
  "modes": {
    "tellMeTheOdds": {
      "answered": 0,
      "correct": 0,
      "currentStreak": 0,
      "bestStreak": 0
    },
    "whatsTheBet": {
      "answered": 0,
      "correct": 0,
      "currentStreak": 0,
      "bestStreak": 0
    }
  },
  "weakSpots": {},
  "answeredPrompts": {},
  "settings": {}
}
```

The exact profile schema can evolve, but it must stay versioned.

## Prompt Scoring Identity

The app should use the whole normalized prompt as the lookup key for answered prompts. This prevents the exact same hand and seed from being scored twice.

Example canonical keys:

```text
mode=odds&hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9
mode=bet&hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9
```

The profile stores answered prompt records by canonical key.

When the player answers:

- If the key has not been answered, record the answer and update aggregate stats.
- If the key has already been answered, show the prior answer state and feedback, but do not update aggregate stats again.
- Reloading the same URL restores the previous answer state.
- A same hand with a different seed is a different scored prompt.

## Testing Strategy

Testing should focus heavily on correctness in the engine and state layer.

Required coverage:

- Deck tests: 52 unique cards, known-card removal, duplicate detection.
- Card parser tests: compact strings parse and reject invalid input.
- Hand evaluator tests: all hand ranks are recognized and compared correctly.
- Enumeration tests: known draw examples produce expected outs and probabilities.
- Push tests: target-rank ties are bucketed separately and excluded from win probability.
- Pot odds tests: Call/Fold threshold uses call / (pot + call).
- Hash tests: parse, validate, canonicalize, and reject malformed or duplicate-card URLs.
- Seed tests: same hash produces same answer order and distractors.
- Profile tests: same canonical key cannot update aggregate stats twice.

## Out Of Scope For V1

- Full poker table simulation.
- Opponent hand ranges.
- Removing imagined opponent cards for generic targets.
- Multi-card runout enumeration from flop to river.
- Accounts or cloud sync.
- Multiplayer.
- Implied odds, bluffing, future betting, or opponent behavior.
