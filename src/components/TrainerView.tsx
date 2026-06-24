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

type AnswerChoice = {
  key: string;
  label: string;
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
  const isGuaranteedWin = outcomes.win === outcomes.remaining;
  const displayedWinOuts = isGuaranteedWin ? 0 : outcomes.win;
  const hasWinningCards = !isGuaranteedWin && outcomes.winningCards.length > 0;
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [showWinningCards, setShowWinningCards] = useState(false);
  const activeAnswer =
    restoredAnswer !== null
      ? { key: promptKey, ...restoredAnswer }
      : answer?.key === promptKey
        ? answer
        : null;
  const answerChoices = useMemo<AnswerChoice[]>(() => {
    if (answerModel.kind === "odds") {
      const correctLabel = formatOptionPercent(roundProbability(answerModel.correctProbability));

      return answerModel.options.map((option) => {
        const label = formatOptionPercent(option);

        return {
          key: label,
          label,
          correct: label === correctLabel,
        };
      });
    }

    return (["call", "fold"] as const).map((action) => ({
      key: action,
      label: titleCase(action),
      correct: action === answerModel.correctAction,
    }));
  }, [answerModel]);
  const visibleAnswerChoices =
    activeAnswer === null
      ? answerChoices
      : answerChoices.filter(
          (choice) => choice.correct || choice.label === activeAnswer.selected,
        );

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
      <div className="prompt-panel">
        <CardRow label="Opponent hand" cards={prompt.opponent} />
        <CardRow label="Board" cards={prompt.board} />
        <CardRow label="Player hand" cards={prompt.hero} />

        {prompt.mode === "bet" ? (
          <div className="bet-line" aria-label="Bet details">
            <span>Pot: {formatMoney(prompt.pot)}</span>
            <span>Call: {formatMoney(prompt.call)}</span>
          </div>
        ) : null}
      </div>

      <div className="answer-panel">
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

        <div className="win-chance-details" aria-label="Win chance details" aria-live="polite">
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
              <button className="next-button" onClick={onNext} type="button">
                Next
              </button>
            </>
          )}
        </div>
      </div>
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
  return Number.isFinite(value) ? formatMoney(value) : "Any";
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function roundProbability(value: number): number {
  return Number(value.toFixed(2));
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
