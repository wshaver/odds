import { useEffect, useMemo, useState } from "react";

import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { maxCorrectCall, requiredEquity } from "../engine/potOdds";
import { canonicalPromptKey } from "../prompts/hashRouter";
import { getAnswerModel } from "../prompts/questionGenerator";
import type { Prompt } from "../prompts/types";
import { CardView } from "./CardView";

export type TrainerAnswer = {
  key: string;
  selected: string;
  correct: boolean;
};

export type TrainerViewProps = {
  prompt: Prompt;
  onNext: () => void;
  onAnswered: (answer: TrainerAnswer) => void;
  restoredAnswer?: Omit<TrainerAnswer, "key"> | null;
};

type AnswerState = {
  key: string;
  selected: string;
  correct: boolean;
};

export function TrainerView({
  prompt,
  onNext,
  onAnswered,
  restoredAnswer = null,
}: TrainerViewProps) {
  const answerModel = useMemo(
    () => (prompt.mode === "odds" ? getAnswerModel(prompt) : getAnswerModel(prompt)),
    [prompt],
  );
  const outcomes = useMemo(() => enumerateNextCardOutcomes(prompt), [prompt]);
  const promptKey = useMemo(() => canonicalPromptKey(prompt), [prompt]);
  const betRequiredEquity = prompt.mode === "bet" ? requiredEquity(prompt.pot, prompt.call) : null;
  const betMaxCorrectCall =
    prompt.mode === "bet"
      ? maxCorrectCall({ pot: prompt.pot, winProbability: outcomes.winProbability })
      : null;
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [showWinningCards, setShowWinningCards] = useState(false);
  const activeAnswer =
    restoredAnswer !== null
      ? { key: promptKey, ...restoredAnswer }
      : answer?.key === promptKey
        ? answer
        : null;

  useEffect(() => {
    setAnswer(null);
    setShowWinningCards(false);
  }, [promptKey]);

  function answerPrompt(selected: string, correct: boolean): void {
    if (activeAnswer !== null) {
      return;
    }

    setAnswer({ key: promptKey, selected, correct });
    onAnswered({ key: promptKey, selected, correct });
  }

  return (
    <section className="trainer-layout" aria-label="Poker odds trainer">
      <div className="trainer-main">
        <div className="prompt-panel">
          <CardRow label="Hero" cards={prompt.hero} />
          <CardRow label="Board" cards={prompt.board} />

          <div className="target-line">
            <span className="section-label">Target hand</span>
            <strong>{formatHandRank(prompt.target)}</strong>
          </div>

          {prompt.mode === "bet" ? (
            <div className="bet-line" aria-label="Bet details">
              <span>Pot: {prompt.pot}</span>
              <span>Call: {prompt.call}</span>
            </div>
          ) : null}
        </div>

        <div className="answer-panel">
          <h2>{prompt.mode === "odds" ? "What is the win chance?" : "What is the bet?"}</h2>
          <div className="answer-grid">
            {answerModel.kind === "odds"
              ? answerModel.options.map((option) => {
                  const selected = formatOptionPercent(option);
                  const correct =
                    selected ===
                    formatOptionPercent(roundProbability(answerModel.correctProbability));

                  return (
                    <button
                      className="answer-button"
                      disabled={activeAnswer !== null}
                      key={selected}
                      onClick={() => answerPrompt(selected, correct)}
                      type="button"
                    >
                      {selected}
                    </button>
                  );
                })
              : (["call", "fold"] as const).map((action) => {
                  const selected = titleCase(action);

                  return (
                    <button
                      className="answer-button"
                      disabled={activeAnswer !== null}
                      key={action}
                      onClick={() =>
                        answerPrompt(selected, action === answerModel.correctAction)
                      }
                      type="button"
                    >
                      {selected}
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      <aside className="feedback-panel" aria-live="polite">
        {activeAnswer === null ? (
          <p className="feedback-placeholder">Answer to see the card math.</p>
        ) : (
          <>
            <div className={activeAnswer.correct ? "result-correct" : "result-miss"}>
              {activeAnswer.correct ? "Correct" : "Review"}
            </div>
            <dl className="feedback-list">
              <div>
                <dt>Selected answer {activeAnswer.selected}</dt>
                <dd aria-hidden="true">{activeAnswer.selected}</dd>
              </div>
              <div>
                <dt>Win outs {outcomes.win}</dt>
                <dd aria-hidden="true">{outcomes.win}</dd>
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
                <dt>
                  Win chance {formatPercent(outcomes.winProbability)} ({outcomes.win} /{" "}
                  {outcomes.remaining})
                </dt>
                <dd aria-hidden="true">
                  {formatPercent(outcomes.winProbability)} ({outcomes.win} / {outcomes.remaining})
                </dd>
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
            <p className="feedback-note">Pushes are neutral and do not count as wins.</p>
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
            <button className="next-button" onClick={onNext} type="button">
              Next
            </button>
          </>
        )}
      </aside>
    </section>
  );
}

function CardRow({ label, cards }: { label: string; cards: Prompt["hero"] }) {
  return (
    <div className="card-row-wrap">
      <span className="section-label">{label}</span>
      <div className="card-row">
        {cards.map((card) => (
          <CardView card={card} key={`${card.rank}${card.suit}`} />
        ))}
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatOptionPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatChipAmount(value: number): string {
  return Number.isFinite(value) ? String(value) : "Any";
}

function roundProbability(value: number): number {
  return Number(value.toFixed(2));
}

function formatHandRank(value: string): string {
  return value
    .split("-")
    .map((part) => titleCase(part))
    .join(" ");
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
