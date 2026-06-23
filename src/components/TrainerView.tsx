import { useEffect, useMemo, useState } from "react";

import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { requiredEquity } from "../engine/potOdds";
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
};

type AnswerState = {
  key: string;
  selected: string;
  correct: boolean;
};

export function TrainerView({ prompt, onNext, onAnswered }: TrainerViewProps) {
  const answerModel = useMemo(
    () => (prompt.mode === "odds" ? getAnswerModel(prompt) : getAnswerModel(prompt)),
    [prompt],
  );
  const outcomes = useMemo(() => enumerateNextCardOutcomes(prompt), [prompt]);
  const promptKey = useMemo(() => canonicalPromptKey(prompt), [prompt]);
  const betRequiredEquity = prompt.mode === "bet" ? requiredEquity(prompt.pot, prompt.call) : null;
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const activeAnswer = answer?.key === promptKey ? answer : null;

  useEffect(() => {
    setAnswer(null);
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
                  const selected = formatPercent(option);
                  const correct =
                    selected === formatPercent(roundProbability(answerModel.correctProbability));

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
                <dt>Win chance {formatPercent(outcomes.winProbability)}</dt>
                <dd aria-hidden="true">{formatPercent(outcomes.winProbability)}</dd>
              </div>
              {betRequiredEquity !== null ? (
                <div>
                  <dt>Required equity {formatPercent(betRequiredEquity)}</dt>
                  <dd aria-hidden="true">{formatPercent(betRequiredEquity)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="feedback-note">Pushes are neutral and do not count as wins.</p>
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
  return `${Math.round(value * 100)}%`;
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
