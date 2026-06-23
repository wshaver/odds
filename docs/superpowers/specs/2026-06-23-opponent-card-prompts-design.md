# Opponent Card Prompts Design

## Purpose

Replace generic "hand to beat" prompts with visible two-card opponent hands. The trainer should feel like an actual heads-up poker situation: the player estimates whether the next card lets their hand beat the opponent's exact hand, with pushes treated as neutral.

This fixes cases where the current category target model feels wrong, such as making a weak pair against an unspecified pair, or counting a board pair as a win when both players share it.

## Prompt Model

Prompts contain:

- `mode`: `odds` or `bet`.
- `hero`: exactly two player cards.
- `opponent`: exactly two opponent cards.
- `board`: three or four visible community cards for odds mode, and four visible community cards for bet mode.
- `seed`: compact presentation seed.
- `pot` and `call`: bet mode only.

The old `target` hand-rank field is no longer part of newly generated prompts. The UI shows only cards for the opponent, not a derived hand label.

## Prompt Generation

The generator deals from one shuffled 52-card deck:

1. Player hand: first two cards.
2. Opponent hand: next two cards.
3. Board: next three or four cards depending on mode.

The generator still avoids dead prompts where the player has no winning next-card outcomes when possible, using the existing bounded retry pattern.

## Enumeration

The enumerator removes all known cards from the deck:

- Player hand.
- Opponent hand.
- Board.

For each legal next card, it evaluates the best poker hand for both players using:

```text
player hand + board + next card
opponent hand + board + next card
```

It classifies each candidate card as:

- `win`: the player's best hand is strictly stronger.
- `push`: both best hands are exactly tied.
- `miss`: the opponent's best hand is stronger.

The win probability remains:

```text
wins / remaining next cards
```

Pushes are shown in feedback but do not count as wins.

## Hand Comparison

The current category-only evaluator is not enough because it cannot distinguish pair rank, kickers, or exact ties. The engine needs a full ranked-hand comparison.

The evaluator should produce comparable hand scores for five-card poker hands, then choose the best five-card score from each five-to-seven-card set.

Scores must compare:

- Hand category, from high card through straight flush.
- Primary made-hand ranks, such as pair rank, trip rank, or straight high card.
- Kickers in descending order.

Equal scores are pushes. This naturally handles shared-board ties because both players can end with the same best five cards.

## User Interface

The prompt panel shows:

- Board.
- Opponent hand.
- Player hand.
- Pot and call details in bet mode.

It does not show a text label such as "Opponent has pair" or "Hand to beat". The question text can stay mode-focused:

- Odds mode: "What is the win chance?"
- Bet mode: "What is the bet?"

Feedback keeps the existing structure: selected answer, win outs, pushes, remaining cards, win chance, and bet math where applicable.

## Hash URL State

New generated routes use `opponent=...` and omit `target=...`.

Example routes:

```text
#/odds?hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9
#/bet?hero=AsJs&opponent=TcTd&board=Ah7c2d9s&pot=120&call=30&seed=k4p9
```

Validation must require:

- Exactly two hero cards.
- Exactly two opponent cards.
- No duplicate cards across hero, opponent, and board.
- Odds mode board length of three or four.
- Bet mode board length of exactly four.
- Positive pot and call values in bet mode.

Old target-based URLs may be treated as invalid and replaced with a newly generated prompt. Preserving old target links is out of scope for this change.

## Answer Identity

Prompt signatures and canonical profile keys include the opponent cards and no longer include the target hand rank. A same visible situation with a different seed remains a different scored prompt, matching the current answer-choice behavior.

## Testing Strategy

Engine tests should cover:

- Known-card removal includes opponent cards.
- Pair rank comparison: pair of jacks beats pair of tens, pair of eights does not.
- Kicker comparison within the same category.
- Shared-board pushes are classified as pushes.
- Exact tied hands are pushes and excluded from win probability.
- Winning card lists contain only cards that strictly beat the opponent.

Prompt and route tests should cover:

- Generated prompts include exactly two opponent cards and no duplicates.
- Hash parsing accepts `opponent`.
- Hash canonicalization emits `opponent` and omits `target`.
- Old target-only hashes are rejected or replaced through the existing invalid-route path.

UI tests should cover:

- The opponent hand row renders two cards.
- The old generic target label is not rendered.
- Feedback still reports wins, pushes, remaining cards, and win chance.

## Out Of Scope

- Opponent ranges.
- Multi-opponent pots.
- Multi-card runout enumeration from flop to river.
- Implied odds, bluffing, future betting, or opponent behavior.
- Displaying derived labels for the opponent's current hand.
