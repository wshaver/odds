# Modern Poker Table Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current panel-based trainer screen with a CSS-only modern poker table layout that keeps mode switching clear and supports future modes.

**Architecture:** Keep the existing React state, prompt generation, answer calculation, and routing logic intact. Restructure only the presentational markup in `App.tsx` and `TrainerView.tsx`, then replace the stylesheet with table-stage, action-pad, feedback-strip, and responsive rules.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS.

---

## File Structure

- Modify `src/App.tsx`: keep app state logic; adjust the top bar markup so the title, progress counters, and mode selector have clear styling hooks for a scalable mode bar.
- Modify `src/App.test.tsx`: add coverage for the mode bar as a distinct mode selector and progress area.
- Modify `src/components/TrainerView.tsx`: keep answer/state logic; replace the two-panel layout with table-stage regions, action pad, table badges, and feedback strip.
- Modify `src/components/TrainerView.test.tsx`: update layout expectations from "left panel / answer panel" language to table-stage semantics and verify visible opponent, equal card rendering hooks, badges, action pad, and feedback strip behavior.
- Modify `src/components/CardView.tsx`: add rank/suit data attributes only if needed for styling or testing; preserve accessible labels.
- Modify `src/styles.css`: replace current panel styling with the modern poker table visual system, responsive table layout, top-bar mode styling, equal card sizing, action pad, badges, and feedback strip.

## Task 1: Top Bar Mode Foundation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add tests for the mode bar structure**

Update `src/App.test.tsx` with this test inside the existing `describe("App", () => { ... })` block:

```tsx
test("renders a distinct mode bar with progress counters", () => {
  render(<App />);

  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Training modes" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Odds" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Bet" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Odds");
  expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Bet");
});
```

- [ ] **Step 2: Run the focused App test and verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the header does not yet expose `role="banner"`, the mode selector is not a navigation named `Training modes`, and progress does not have label `Mode progress`.

- [ ] **Step 3: Update `App.tsx` top bar markup**

In `src/App.tsx`, replace the `<header className="top-bar">...</header>` JSX with:

```tsx
<header className="top-bar" role="banner">
  <div className="brand-block">
    <h1>Odds</h1>
    <div className="stats-line" aria-label="Mode progress">
      <span>
        Odds {profile.modes.tellMeTheOdds.correct}/
        {profile.modes.tellMeTheOdds.answered}
      </span>
      <span>
        Bet {profile.modes.whatsTheBet.correct}/
        {profile.modes.whatsTheBet.answered}
      </span>
    </div>
  </div>
  <nav className="mode-buttons" aria-label="Training modes">
    <button
      aria-pressed={prompt.mode === "odds"}
      onClick={() => switchMode("odds")}
      type="button"
    >
      Odds
    </button>
    <button
      aria-pressed={prompt.mode === "bet"}
      onClick={() => switchMode("bet")}
      type="button"
    >
      Bet
    </button>
  </nav>
</header>
```

- [ ] **Step 4: Run the focused App test and verify it passes**

Run: `npm test -- src/App.test.tsx`

Expected: PASS for all `App` tests.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Prepare scalable trainer mode bar"
```

## Task 2: Table Stage Markup

**Files:**
- Modify: `src/components/TrainerView.tsx`
- Modify: `src/components/TrainerView.test.tsx`

- [ ] **Step 1: Replace layout-order test with table-region semantics**

In `src/components/TrainerView.test.tsx`, replace the test named `"orders opponent hand, board, and player hand on the left"` with:

```tsx
test("renders visible opponent, board, and hero cards inside the table stage", () => {
  const prompt = generatePrompt("odds", "TrainerLayoutOrder");

  render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

  expect(screen.getByLabelText("Poker table")).toBeInTheDocument();
  expect(screen.getByLabelText("Opponent hand")).toBeInTheDocument();
  expect(screen.getByLabelText("Board cards")).toBeInTheDocument();
  expect(screen.getByLabelText("Hero hand")).toBeInTheDocument();
  expect(screen.getByLabelText("Answer choices")).toBeInTheDocument();

  for (const card of [...prompt.opponent, ...prompt.board, ...prompt.hero]) {
    expect(screen.getByLabelText(cardToString(card))).toBeInTheDocument();
  }

  expect(screen.queryByText(/Pair|Two Pair|Trips|Straight|Flush|Full House/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add a test for table badges**

Add this test near the other bet prompt test:

```tsx
test("renders table badges for bet prompt pot and call values", () => {
  const prompt = generatePrompt("bet", "TrainerBetBadges");

  render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

  expect(screen.getByLabelText("Table status")).toHaveTextContent(`Pot ${formatMoney(prompt.pot)}`);
  expect(screen.getByLabelText("Table status")).toHaveTextContent(`Call ${formatMoney(prompt.call)}`);
});
```

- [ ] **Step 3: Run the focused TrainerView tests and verify they fail**

Run: `npm test -- src/components/TrainerView.test.tsx`

Expected: FAIL because the new table labels and table badge structure do not exist yet.

- [ ] **Step 4: Restructure `TrainerView.tsx` return markup**

Keep all hooks and helper functions unchanged. Replace the `return (...)` block in `TrainerView` with:

```tsx
return (
  <section className="trainer-layout" aria-label="Poker odds trainer">
    <div className="table-stage" aria-label="Poker table">
      <div className="table-felt">
        <CardRow className="opponent-zone" label="Opponent hand" cards={prompt.opponent} />

        <div className="board-zone">
          <CardRow label="Board cards" cards={prompt.board} />
          <div className="table-badges" aria-label="Table status">
            {prompt.mode === "bet" ? (
              <>
                <span>Pot {formatMoney(prompt.pot)}</span>
                <span>Call {formatMoney(prompt.call)}</span>
              </>
            ) : (
              <span>Win chance ?</span>
            )}
          </div>
        </div>

        <CardRow className="hero-zone" label="Hero hand" cards={prompt.hero} />

        <div className="action-pad" aria-label="Answer choices">
          <h2>{prompt.mode === "odds" ? "What is the win chance?" : "What is the bet?"}</h2>
          <div className="answer-grid">
            {visibleAnswerChoices.map((choice) => {
              const resultClass =
                activeAnswer === null
                  ? ""
                  : choice.correct
                    ? "answer-correct"
                    : choice.label === activeAnswer.selected
                      ? "answer-incorrect"
                      : "";
              const selectedClass =
                activeAnswer !== null && choice.label === activeAnswer.selected
                  ? "answer-selected"
                  : "";

              return (
                <button
                  className={["answer-button", resultClass, selectedClass].filter(Boolean).join(" ")}
                  disabled={activeAnswer !== null}
                  key={choice.key}
                  onClick={() => answerPrompt(choice.label, choice.correct)}
                  type="button"
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
          {activeAnswer !== null ? (
            <button className="next-button" onClick={onNext} type="button">
              Next
            </button>
          ) : null}
        </div>

        <div className="feedback-strip win-chance-details" aria-label="Win chance details" aria-live="polite">
          {activeAnswer === null ? (
            null
          ) : (
            <>
              <div className={activeAnswer.correct ? "result-correct" : "result-miss"}>
                {activeAnswer.correct ? "Correct" : "Incorrect"}
              </div>
              <dl className="feedback-list">
                <div>
                  <dt>Win outs {displayedWinOuts}</dt>
                  <dd aria-hidden="true">{displayedWinOuts}</dd>
                </div>
                <div>
                  <dt>Pushes {outcomes.push}</dt>
                  <dd aria-hidden="true">{outcomes.push}</dd>
                </div>
                <div>
                  <dt>Remaining cards {outcomes.remaining}</dt>
                  <dd aria-hidden="true">{outcomes.remaining}</dd>
                </div>
                <div>
                  {isGuaranteedWin ? (
                    <>
                      <dt>Win chance {formatPercent(outcomes.winProbability)}</dt>
                      <dd aria-hidden="true">{formatPercent(outcomes.winProbability)}</dd>
                    </>
                  ) : (
                    <>
                      <dt>
                        Win chance {formatPercent(outcomes.winProbability)} ({outcomes.win} /{" "}
                        {outcomes.remaining})
                      </dt>
                      <dd aria-hidden="true">
                        {formatPercent(outcomes.winProbability)} ({outcomes.win} /{" "}
                        {outcomes.remaining})
                      </dd>
                    </>
                  )}
                </div>
                {betRequiredEquity !== null ? (
                  <div>
                    <dt>Required equity {formatPercent(betRequiredEquity)}</dt>
                    <dd aria-hidden="true">{formatPercent(betRequiredEquity)}</dd>
                  </div>
                ) : null}
                {betMaxCorrectCall !== null ? (
                  <div>
                    <dt>Max correct call {formatChipAmount(betMaxCorrectCall)}</dt>
                    <dd aria-hidden="true">{formatChipAmount(betMaxCorrectCall)}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="feedback-note">
                {isGuaranteedWin
                  ? "Already winning on every remaining card."
                  : "Pushes are neutral and do not count as wins."}
              </p>
              {hasWinningCards ? (
                <>
                  <button
                    className="secondary-button"
                    onClick={() => setShowWinningCards((current) => !current)}
                    type="button"
                  >
                    {showWinningCards ? "Hide winning cards" : "View winning cards"}
                  </button>
                  {showWinningCards ? (
                    <div className="winning-cards" aria-label="Winning cards">
                      {outcomes.winningCards.map((card) => (
                        <CardView card={card} key={`${card.rank}${card.suit}`} />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  </section>
);
```

Then replace `CardRow` with:

```tsx
function CardRow({
  label,
  cards,
  className = "",
}: {
  label: string;
  cards: Prompt["hero"];
  className?: string;
}) {
  return (
    <div className={["card-row-wrap", className].filter(Boolean).join(" ")} aria-label={label}>
      <span className="section-label">{label}</span>
      <div className="card-row">
        {cards.map((card) => (
          <CardView card={card} key={`${card.rank}${card.suit}`} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the existing bet details assertion**

In the test named `"answers a bet prompt with Call/Fold and shows required equity"`, replace:

```tsx
expect(screen.getByLabelText("Bet details")).toHaveTextContent(`Pot: ${formatMoney(prompt.pot)}`);
expect(screen.getByLabelText("Bet details")).toHaveTextContent(`Call: ${formatMoney(prompt.call)}`);
```

with:

```tsx
expect(screen.getByLabelText("Table status")).toHaveTextContent(`Pot ${formatMoney(prompt.pot)}`);
expect(screen.getByLabelText("Table status")).toHaveTextContent(`Call ${formatMoney(prompt.call)}`);
```

- [ ] **Step 6: Run focused TrainerView tests and verify they pass**

Run: `npm test -- src/components/TrainerView.test.tsx`

Expected: PASS for all `TrainerView` tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/TrainerView.tsx src/components/TrainerView.test.tsx
git commit -m "Restructure trainer as poker table stage"
```

## Task 3: Equal Card Styling Hook

**Files:**
- Modify: `src/components/CardView.tsx`
- Modify: `src/components/CardView.test.tsx`

- [ ] **Step 1: Add a CardView test for stable class and accessible label**

In `src/components/CardView.test.tsx`, ensure there is a test equivalent to:

```tsx
test("renders a playing card with a stable styling class and accessible label", () => {
  render(<CardView card={{ rank: "A", suit: "h" }} />);

  const card = screen.getByLabelText("Ah");

  expect(card).toHaveClass("playing-card", "card-red");
  expect(card).toHaveTextContent("A");
  expect(card).toHaveTextContent("♥");
});
```

- [ ] **Step 2: Run the CardView test**

Run: `npm test -- src/components/CardView.test.tsx`

Expected: PASS if existing `CardView` already satisfies this; otherwise FAIL on the missing expectation.

- [ ] **Step 3: Keep `CardView.tsx` minimal**

If the test passes, do not change `CardView.tsx`. If the suit symbol encoding is broken in the file, replace `SUIT_SYMBOLS` with:

```tsx
const SUIT_SYMBOLS: Record<Card["suit"], string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};
```

- [ ] **Step 4: Run the CardView test again**

Run: `npm test -- src/components/CardView.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit if files changed**

If the test file or component changed:

```bash
git add src/components/CardView.tsx src/components/CardView.test.tsx
git commit -m "Confirm stable playing card rendering"
```

If nothing changed, skip this commit.

## Task 4: Modern Poker Table CSS

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the current panel CSS with table styling**

Replace `src/styles.css` with CSS that defines these stable class groups:

```css
:root {
  color: #f4f7ef;
  background: #080d0b;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  background:
    radial-gradient(circle at 50% -20%, rgba(45, 77, 61, 0.42), transparent 36rem),
    linear-gradient(180deg, #111a16 0%, #080d0b 58%, #050807 100%);
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 1px solid rgba(244, 247, 239, 0.2);
  border-radius: 8px;
  cursor: pointer;
}

button:disabled {
  cursor: default;
}

.app-shell {
  min-height: 100vh;
  padding: 18px;
}

.top-bar {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1180px;
}

.brand-block h1 {
  font-size: 1.25rem;
  line-height: 1.2;
  margin: 0 0 6px;
}

.stats-line {
  color: #b9c9bd;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.9rem;
  gap: 10px;
}

.stats-line span {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 4px 9px;
}

.mode-buttons {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  display: flex;
  gap: 4px;
  padding: 4px;
}

.mode-buttons button {
  background: transparent;
  border-color: transparent;
  color: #d9e6db;
  min-height: 36px;
  min-width: 76px;
  padding: 6px 14px;
}

.mode-buttons button[aria-pressed="true"] {
  background: #e8f5e7;
  color: #123324;
}

.trainer-layout {
  margin: 0 auto;
  max-width: 1180px;
}

.table-stage {
  min-height: 620px;
  position: relative;
}

.table-felt {
  background:
    radial-gradient(ellipse at 50% 44%, rgba(69, 154, 86, 0.42), transparent 34%),
    radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.08), transparent 62%),
    repeating-linear-gradient(34deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 7px),
    linear-gradient(180deg, #126633 0%, #064a28 100%);
  border: 18px solid #4a2b1d;
  border-radius: 48% / 42%;
  box-shadow:
    inset 0 0 0 7px rgba(220, 151, 84, 0.28),
    inset 0 18px 70px rgba(255, 255, 255, 0.08),
    inset 0 -34px 80px rgba(0, 0, 0, 0.28),
    0 28px 80px rgba(0, 0, 0, 0.48);
  min-height: 620px;
  overflow: hidden;
  position: relative;
}

.card-row-wrap {
  position: absolute;
}

.section-label {
  color: #d7e5d7;
  display: block;
  font-size: 0.74rem;
  font-weight: 800;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.card-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.opponent-zone {
  left: 12%;
  top: 12%;
}

.board-zone {
  left: 50%;
  position: absolute;
  top: 42%;
  transform: translate(-50%, -50%);
}

.board-zone .card-row-wrap,
.board-zone .section-label {
  position: static;
  text-align: center;
}

.hero-zone {
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
}

.playing-card {
  align-items: center;
  background:
    linear-gradient(145deg, #ffffff 0%, #f4f1e8 100%);
  border: 1px solid #d7d4c9;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.26);
  display: inline-flex;
  flex: 0 0 78px;
  font-weight: 900;
  gap: 4px;
  height: 104px;
  justify-content: center;
  line-height: 1;
  padding: 10px;
  width: 78px;
}

.card-red {
  color: #bd222b;
}

.card-black {
  color: #111715;
}

.card-rank {
  display: inline-block;
  font-size: 1.35rem;
  text-align: center;
  width: 2ch;
}

.card-suit {
  font-size: 1.3rem;
}

.table-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
}

.table-badges span {
  background: rgba(8, 16, 12, 0.72);
  border: 1px solid rgba(241, 224, 166, 0.28);
  border-radius: 999px;
  color: #f7e8ad;
  font-weight: 800;
  padding: 7px 12px;
}

.action-pad {
  background: rgba(8, 15, 12, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  bottom: 34px;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
  padding: 12px;
  position: absolute;
  right: 38px;
  width: min(320px, 32vw);
}

.action-pad h2 {
  color: #f4f7ef;
  font-size: 1rem;
  line-height: 1.3;
  margin: 0 0 10px;
}

.answer-grid {
  display: grid;
  gap: 8px;
}

.answer-button,
.next-button,
.secondary-button {
  font-weight: 850;
  min-height: 46px;
  padding: 10px 12px;
}

.answer-button {
  background: #eef3ec;
  color: #102419;
}

.answer-button:hover:not(:disabled) {
  background: #ffffff;
}

.answer-button:disabled {
  opacity: 1;
}

.answer-button.answer-selected {
  box-shadow:
    0 0 0 2px #0b120e,
    0 0 0 5px #f6e28d;
}

.answer-button.answer-correct {
  background: #dcf4df;
  border-color: #6fd083;
  color: #0b612c;
}

.answer-button.answer-incorrect {
  background: #ffe1df;
  border-color: #e0736c;
  color: #8a1f1f;
}

.next-button {
  background: #f6d76a;
  border-color: #f6d76a;
  color: #1b1708;
  margin-top: 10px;
  width: 100%;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.08);
  color: #f4f7ef;
  width: 100%;
}

.feedback-strip {
  background: rgba(7, 13, 10, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  bottom: 34px;
  color: #ecf4ee;
  left: 38px;
  max-width: min(520px, 46vw);
  padding: 12px;
  position: absolute;
}

.feedback-strip:empty {
  display: none;
}

.result-correct,
.result-miss {
  border-radius: 6px;
  font-weight: 900;
  margin-bottom: 10px;
  padding: 7px 9px;
}

.result-correct {
  background: rgba(96, 205, 120, 0.16);
  color: #98f0a8;
}

.result-miss {
  background: rgba(224, 83, 78, 0.16);
  color: #ffaaa5;
}

.feedback-list {
  display: grid;
  gap: 7px 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.feedback-list div {
  min-width: 0;
}

.feedback-list dt {
  color: #d7e5d7;
  font-size: 0.88rem;
}

.feedback-list dd {
  margin: 0;
}

.feedback-list dd[aria-hidden="true"] {
  display: none;
}

.feedback-note {
  color: #b9c9bd;
  font-size: 0.88rem;
  line-height: 1.35;
  margin: 10px 0;
}

.winning-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

@media (max-width: 760px) {
  .app-shell {
    padding: 12px;
  }

  .top-bar {
    align-items: stretch;
    display: grid;
  }

  .mode-buttons {
    overflow-x: auto;
  }

  .table-stage,
  .table-felt {
    min-height: auto;
  }

  .table-felt {
    border-width: 12px;
    border-radius: 28px;
    display: grid;
    gap: 22px;
    justify-items: center;
    overflow: visible;
    padding: 28px 14px;
  }

  .card-row-wrap,
  .board-zone,
  .hero-zone,
  .action-pad,
  .feedback-strip {
    bottom: auto;
    left: auto;
    max-width: none;
    position: static;
    right: auto;
    top: auto;
    transform: none;
    width: 100%;
  }

  .card-row {
    justify-content: center;
  }

  .playing-card {
    flex-basis: 64px;
    height: 88px;
    width: 64px;
  }

  .action-pad,
  .feedback-strip {
    width: 100%;
  }

  .feedback-list {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: PASS. CSS changes should not affect Testing Library behavior.

- [ ] **Step 3: Run a production build**

Run: `npm run build`

Expected: PASS with Vite build output and no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "Style trainer as modern poker table"
```

## Task 5: Visual Verification And Polish

**Files:**
- Modify: `src/styles.css` if visual defects are found.
- Modify: `src/components/TrainerView.tsx` only if markup is required to fix overlap or accessibility defects.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Expected: Vite reports a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 2: Check desktop odds mode**

Open the local URL at about 1280px wide. Verify:

- Opponent cards are visible near the top-left/top rail.
- Board cards are centered.
- Hero cards are near the bottom center.
- All cards are the same size.
- The action pad is bottom-right.
- The top mode bar clearly shows `Odds` active and `Bet` inactive.

- [ ] **Step 3: Check desktop bet mode**

Click `Bet`. Verify:

- `Bet` is active in the top mode bar.
- Pot and call badges appear near the board.
- Fold/call buttons appear in the same action pad.
- After answering, required equity and max correct call appear in the feedback strip.

- [ ] **Step 4: Check mobile layout**

Resize to about 390px wide. Verify:

- The table becomes a vertical rounded felt surface.
- Cards do not overflow horizontally.
- Mode selector remains visible above the table.
- Action buttons and feedback stack below the card groups without overlap.

- [ ] **Step 5: Apply targeted CSS fixes**

If any overlap or overflow is found, adjust only the affected selectors in `src/styles.css`. Prefer changing fixed positions, widths, gaps, or media-query sizing over changing trainer logic.

- [ ] **Step 6: Re-run verification commands**

Run:

```bash
npm test
npm run build
```

Expected: both commands PASS.

- [ ] **Step 7: Commit visual polish if files changed**

```bash
git add src/styles.css src/components/TrainerView.tsx
git commit -m "Polish poker table responsive layout"
```

## Self-Review

- Spec coverage: Tasks cover the top mode bar, full table stage, visible opponent hand, equal card sizing, board-centered layout, pot/status badges, bottom-right action pad, feedback strip, no image assets, and desktop/mobile verification.
- Placeholder scan: No unfinished implementation sections are present.
- Type consistency: The plan uses existing `Prompt`, `PromptMode`, `TrainerView`, `CardView`, `formatMoney`, `visibleAnswerChoices`, `activeAnswer`, and feedback variables already present in the source.
