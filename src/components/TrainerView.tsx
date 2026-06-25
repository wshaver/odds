import { type ReactNode, useEffect, useMemo, useState } from "react";

import { enumerateNextCardOutcomes, enumerateNextCardOutcomesFor } from "../engine/enumerator";
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
    () => getAnswerModel(prompt),
    [prompt],
  );
  const outcomes = useMemo(
    () =>
      prompt.mode === "chase"
        ? enumerateNextCardOutcomesFor({
            subject: prompt.opponent,
            opponent: prompt.hero,
            board: prompt.board,
          })
        : enumerateNextCardOutcomes(prompt),
    [prompt],
  );
  const promptKey = useMemo(() => canonicalPromptKey(prompt), [prompt]);
  const betRequiredEquity = prompt.mode === "bet" ? requiredEquity(prompt.pot, prompt.call) : null;
  const betMaxCorrectCall =
    prompt.mode === "bet"
      ? maxCorrectCall({ pot: prompt.pot, winProbability: outcomes.winProbability })
      : null;
  const chaseHighestCorrectCall =
    answerModel.kind === "chase" ? answerModel.highestCorrectCall : null;
  const chaseCorrectBet = answerModel.kind === "chase" ? answerModel.correctBet : null;
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

    if (answerModel.kind === "chase") {
      return answerModel.options.map((option) => ({
        key: String(option),
        label: formatMoney(option),
        correct: option === answerModel.correctBet,
      }));
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
  const feedbackStrip = (
    <section
      className="feedback-strip win-chance-details"
      aria-label="Win chance details"
      aria-live="polite"
    >
      {activeAnswer === null ? (
        null
      ) : (
        <>
          <div className={activeAnswer.correct ? "result-correct" : "result-miss"}>
            {activeAnswer.correct ? "Correct" : "Incorrect"}
          </div>
          <dl className="feedback-list">
            <div>
              <dt>{prompt.mode === "chase" ? "Biff win outs" : "Win outs"} {displayedWinOuts}</dt>
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
                  <dt>
                    {prompt.mode === "chase" ? "Biff win chance" : "Win chance"}{" "}
                    {formatPercent(outcomes.winProbability)}
                  </dt>
                  <dd aria-hidden="true">{formatPercent(outcomes.winProbability)}</dd>
                </>
              ) : (
                <>
                  <dt>
                    {prompt.mode === "chase" ? "Biff win chance" : "Win chance"}{" "}
                    {formatPercent(outcomes.winProbability)} ({outcomes.win} /{" "}
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
            {chaseHighestCorrectCall !== null ? (
              <div>
                <dt>Highest correct call {formatChipAmount(chaseHighestCorrectCall)}</dt>
                <dd aria-hidden="true">{formatChipAmount(chaseHighestCorrectCall)}</dd>
              </div>
            ) : null}
            {chaseCorrectBet !== null ? (
              <div>
                <dt>Lowest chase-out bet {formatChipAmount(chaseCorrectBet)}</dt>
                <dd aria-hidden="true">{formatChipAmount(chaseCorrectBet)}</dd>
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
    </section>
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
      <section className="table-stage" aria-label="Poker table">
        <div className="table-felt">
          <CardRow className="opponent-zone" label="Biff" cards={prompt.opponent}>
            <div className="table-badges opponent-action" role="group" aria-label="Biff action">
              {prompt.mode === "bet" ? (
                <span>Bet {formatMoney(prompt.call)}</span>
              ) : (
                <span className="table-badge-placeholder" aria-hidden="true" />
              )}
            </div>
          </CardRow>
          <div className="board-zone" role="group" aria-label="Board area">
            <CardRow label="Board cards" cards={prompt.board} hideLabel />
            <div className="table-badges" role="group" aria-label="Table status">
              {prompt.mode === "bet" ? (
                <span>Pot {formatMoney(prompt.pot)}</span>
              ) : prompt.mode === "chase" ? (
                <span>Pot {formatMoney(prompt.pot)}</span>
              ) : (
                <span className="table-badge-placeholder table-badge-placeholder-pot" aria-hidden="true" />
              )}
            </div>
          </div>
          <CardRow className="hero-zone" label="You" cards={prompt.hero} />
        </div>
        <section className="action-pad" aria-label="Answer choices">
          <h2>{questionText(prompt.mode)}</h2>
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
        </section>
        {feedbackStrip}
      </section>
    </section>
  );
}

function CardRow({
  label,
  cards,
  className,
  hideLabel = false,
  children,
}: {
  label: string;
  cards: Prompt["hero"];
  className?: string;
  hideLabel?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={["card-row-wrap", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
    >
      {hideLabel ? null : <span className="section-label">{label}</span>}
      <div className="card-row">
        {cards.map((card) => (
          <CardView card={card} key={`${card.rank}${card.suit}`} />
        ))}
      </div>
      {children}
    </div>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatOptionPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function questionText(mode: Prompt["mode"]): string {
  if (mode === "odds") {
    return "What is the win chance?";
  }
  if (mode === "chase") {
    return "What bet chases Biff out?";
  }
  return "What is the bet?";
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
