import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { canonicalPromptKey } from "../prompts/hashRouter";
import { generatePrompt, getAnswerModel } from "../prompts/questionGenerator";
import type { Prompt } from "../prompts/types";
import { TrainerView } from "./TrainerView";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function optionLabel(value: number): string {
  return formatPercent(value);
}

function expectedOddsCorrect(prompt: Prompt, selected: string): boolean {
  if (prompt.mode !== "odds") {
    throw new Error("Expected odds prompt");
  }

  const model = getAnswerModel(prompt);

  return selected === optionLabel(Number(model.correctProbability.toFixed(2)));
}

describe("TrainerView", () => {
  test("answers an odds prompt and shows feedback including remaining cards", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerOdds1");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const outcomes = enumerateNextCardOutcomes(prompt);
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);

    const selected = optionLabel(model.options[0]);
    await user.click(screen.getByRole("button", { name: selected }));

    expect(screen.getByText(/Selected answer/i)).toHaveTextContent(selected);
    expect(screen.getByText(/Win outs/i)).toHaveTextContent(String(outcomes.win));
    expect(screen.getAllByText(/Pushes/i)[0]).toHaveTextContent(String(outcomes.push));
    expect(screen.getByText(/Remaining cards/i)).toHaveTextContent(
      String(outcomes.remaining),
    );
    expect(screen.getAllByText(/Win chance/i)[1]).toHaveTextContent(
      formatPercent(outcomes.winProbability),
    );
    expect(
      screen.getByText(/Pushes are neutral and do not count as wins/i),
    ).toBeInTheDocument();
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered).toHaveBeenCalledWith({
      key: canonicalPromptKey(prompt),
      selected,
      correct: expectedOddsCorrect(prompt, selected),
    });
  });

  test("does not show stale odds answer feedback after prompt changes", async () => {
    const user = userEvent.setup();
    const firstPrompt = generatePrompt("odds", "TrainerA");
    const secondPrompt = generatePrompt("odds", "TrainerB");
    const firstModel = getAnswerModel(firstPrompt);
    if (firstModel.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const selected = optionLabel(firstModel.options[0]);

    const { rerender } = render(
      <TrainerView prompt={firstPrompt} onNext={vi.fn()} onAnswered={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: selected }));

    expect(screen.getByText(/Selected answer/i)).toHaveTextContent(selected);

    rerender(<TrainerView prompt={secondPrompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Correct|Review/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Answer to see the card math/i)).toBeInTheDocument();
  });

  test("answers a bet prompt with Call/Fold and shows required equity", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("bet", "TrainerBet1");
    const model = getAnswerModel(prompt);
    if (model.kind !== "bet") {
      throw new Error("Expected bet prompt");
    }
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);

    await user.click(screen.getByRole("button", { name: "Call" }));

    expect(screen.getByText(/Selected answer/i)).toHaveTextContent("Call");
    expect(screen.getByText(/Required equity/i)).toHaveTextContent(
      formatPercent(model.requiredEquity),
    );
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered).toHaveBeenCalledWith({
      key: canonicalPromptKey(prompt),
      selected: "Call",
      correct: model.correctAction === "call",
    });
  });

  test("does not call onAnswered again when clicking multiple odds answers after an answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerOddsLock");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);

    await user.click(screen.getByRole("button", { name: optionLabel(model.options[0]) }));
    await user.click(screen.getByRole("button", { name: optionLabel(model.options[1]) }));
    await user.click(screen.getByRole("button", { name: optionLabel(model.options[2]) }));

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  test("does not call onAnswered again when clicking multiple bet answers after an answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("bet", "TrainerBetLock");
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);

    await user.click(screen.getByRole("button", { name: "Call" }));
    await user.click(screen.getByRole("button", { name: "Fold" }));

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  test("Next calls onNext after an answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerNext");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const onNext = vi.fn();

    render(<TrainerView prompt={prompt} onNext={onNext} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: optionLabel(model.options[0]) }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
