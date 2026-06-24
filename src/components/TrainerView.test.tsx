import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { cardToString, parseCardList } from "../engine/cards";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { maxCorrectCall } from "../engine/potOdds";
import { canonicalPromptKey } from "../prompts/hashRouter";
import { generatePrompt, getAnswerModel } from "../prompts/questionGenerator";
import type { Prompt } from "../prompts/types";
import { TrainerView } from "./TrainerView";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function optionLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function expectedOddsCorrect(prompt: Prompt, selected: string): boolean {
  if (prompt.mode !== "odds") {
    throw new Error("Expected odds prompt");
  }

  const model = getAnswerModel(prompt);

  return selected === optionLabel(Number(model.correctProbability.toFixed(2)));
}

describe("TrainerView", () => {
  test("renders visible opponent, board, and hero cards inside the table stage", () => {
    const prompt = generatePrompt("odds", "TrainerLayoutOrder");

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    const table = screen.getByLabelText("Poker table");
    const tableScope = within(table);
    const felt = table.querySelector(".table-felt");

    expect(table).toBeInTheDocument();
    expect(felt).not.toBeNull();
    expect(tableScope.getByLabelText("Opponent hand")).toBeInTheDocument();
    expect(tableScope.getByLabelText("Board cards")).toBeInTheDocument();
    expect(tableScope.getByLabelText("Hero hand")).toBeInTheDocument();
    expect(tableScope.getByLabelText("Answer choices")).toBeInTheDocument();
    expect(tableScope.getByLabelText("Win chance details")).toBeInTheDocument();
    expect(felt).toContainElement(tableScope.getByLabelText("Answer choices"));
    expect(felt).toContainElement(tableScope.getByLabelText("Win chance details"));

    for (const card of [...prompt.opponent, ...prompt.board, ...prompt.hero]) {
      expect(tableScope.getByLabelText(cardToString(card))).toBeVisible();
    }

    expect(screen.queryByText(/Pair|Two Pair|Trips|Straight|Flush|Full House/i)).not.toBeInTheDocument();
  });

  test("keeps answer feedback in the feedback strip and filters choices after an incorrect answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerAnswerFilterWrong");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const correct = optionLabel(Number(model.correctProbability.toFixed(2)));
    const incorrectOptions = model.options
      .map((option) => optionLabel(option))
      .filter((option) => option !== correct);
    const selected = incorrectOptions[0];
    const hiddenIncorrect = incorrectOptions[1];

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: selected }));

    expect(screen.getByRole("button", { name: selected })).toHaveClass(
      "answer-incorrect",
      "answer-selected",
    );
    expect(screen.getByRole("button", { name: correct })).toHaveClass("answer-correct");
    expect(screen.queryByRole("button", { name: hiddenIncorrect })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Win chance details")).not.toHaveTextContent("Selected answer");
  });

  test("shows only the selected correct answer after a correct answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerAnswerFilterCorrect");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const correct = optionLabel(Number(model.correctProbability.toFixed(2)));
    const incorrectOptions = model.options
      .map((option) => optionLabel(option))
      .filter((option) => option !== correct);

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: correct }));

    expect(screen.getByRole("button", { name: correct })).toHaveClass(
      "answer-correct",
      "answer-selected",
    );
    for (const incorrect of incorrectOptions) {
      expect(screen.queryByRole("button", { name: incorrect })).not.toBeInTheDocument();
    }
  });

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

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Win outs/i)).toHaveTextContent(String(outcomes.win));
    expect(screen.getAllByText(/Pushes/i)[0]).toHaveTextContent(String(outcomes.push));
    expect(screen.getByText(/Remaining cards/i)).toHaveTextContent(
      String(outcomes.remaining),
    );
    const details = screen.getByLabelText("Win chance details");
    expect(within(details).getByText(/Win chance/i)).toHaveTextContent(
      formatPercent(outcomes.winProbability),
    );
    expect(within(details).getByText(/Win chance/i)).toHaveTextContent(
      `${outcomes.win} / ${outcomes.remaining}`,
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

  test("shows winning cards only after answering when requested", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerWinningCards");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const outcomes = enumerateNextCardOutcomes(prompt);

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /View winning cards/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: optionLabel(model.options[0]) }));

    expect(screen.queryByLabelText(cardToString(outcomes.winningCards[0]))).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /View winning cards/i }));

    for (const card of outcomes.winningCards) {
      expect(screen.getByLabelText(cardToString(card))).toBeInTheDocument();
    }
  });

  test("hides winning cards button when there are no winning cards", async () => {
    const user = userEvent.setup();
    const prompt: Prompt = {
      mode: "odds",
      hero: parseCardList("9c7d"),
      opponent: parseCardList("AsAd"),
      board: parseCardList("2c2h3s2s"),
      seed: "TrainerNoWinningCards",
    };
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: optionLabel(model.options[0]) }));

    expect(screen.getByText(/Win outs/i)).toHaveTextContent("0");
    expect(
      screen.queryByRole("button", { name: /View winning cards/i }),
    ).not.toBeInTheDocument();
  });

  test("shows zero outs and no winning-card reveal when already winning every river", async () => {
    const user = userEvent.setup();
    const prompt: Prompt = {
      mode: "bet",
      hero: parseCardList("7cTh"),
      opponent: parseCardList("8cQc"),
      board: parseCardList("4sAcTdTs"),
      pot: 160,
      call: 55,
      seed: "TrainerAlreadyWinning",
    };
    const outcomes = enumerateNextCardOutcomes(prompt);

    expect(outcomes.win).toBe(outcomes.remaining);

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Call" }));

    expect(screen.getByText(/Win outs/i)).toHaveTextContent("0");
    expect(screen.getByText(/Win chance/i)).toHaveTextContent("100.0%");
    expect(screen.getByText(/Win chance/i)).not.toHaveTextContent(
      `${outcomes.win} / ${outcomes.remaining}`,
    );
    expect(
      screen.getByText(/Already winning on every remaining card/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /View winning cards/i }),
    ).not.toBeInTheDocument();
  });

  test("restores prior answer feedback and locks answer buttons without recording again", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerRestored");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const selected = optionLabel(model.options[0]);
    const onAnswered = vi.fn();

    render(
      <TrainerView
        prompt={prompt}
        onNext={vi.fn()}
        onAnswered={onAnswered}
        restoredAnswer={{
          selected,
          correct: expectedOddsCorrect(prompt, selected),
        }}
      />,
    );

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Answer to see the card math/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: selected })).toBeDisabled();

    for (const button of screen.getAllByRole("button")) {
      if (button.classList.contains("answer-button")) {
        expect(button).toBeDisabled();
        await user.click(button);
      }
    }

    expect(onAnswered).not.toHaveBeenCalled();
  });

  test("does not show stale restored answer feedback after prompt changes", () => {
    const firstPrompt = generatePrompt("odds", "TrainerRestoredA");
    const secondPrompt = generatePrompt("odds", "TrainerRestoredB");
    const firstModel = getAnswerModel(firstPrompt);
    if (firstModel.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const selected = optionLabel(firstModel.options[0]);

    const { rerender } = render(
      <TrainerView
        prompt={firstPrompt}
        onNext={vi.fn()}
        onAnswered={vi.fn()}
        restoredAnswer={{ selected, correct: true }}
      />,
    );

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();

    rerender(<TrainerView prompt={secondPrompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Correct|Incorrect/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Win chance details")).toBeEmptyDOMElement();
  });

  test("formats win chance with one decimal percent precision", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "TrainerOddsPrecision");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const outcomes = enumerateNextCardOutcomes(prompt);

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: optionLabel(model.options[0]) }));

    expect(within(screen.getByLabelText("Win chance details")).getByText(/Win chance/i)).toHaveTextContent(
      `${(outcomes.winProbability * 100).toFixed(1)}%`,
    );
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

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();

    rerender(<TrainerView prompt={secondPrompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Correct|Incorrect/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Win chance details")).toBeEmptyDOMElement();
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

    expect(screen.getByLabelText("Table status")).toHaveTextContent(`Pot ${formatMoney(prompt.pot)}`);
    expect(screen.getByLabelText("Table status")).toHaveTextContent(`Call ${formatMoney(prompt.call)}`);

    await user.click(screen.getByRole("button", { name: "Call" }));

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Required equity/i)).toHaveTextContent(
      formatPercent(model.requiredEquity),
    );
    expect(screen.getByText(/Max correct call/i)).toHaveTextContent(
      formatMoney(
        maxCorrectCall({
          pot: prompt.pot,
          winProbability: enumerateNextCardOutcomes(prompt).winProbability,
        }),
      ),
    );
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered).toHaveBeenCalledWith({
      key: canonicalPromptKey(prompt),
      selected: "Call",
      correct: model.correctAction === "call",
    });
  });

  test("renders table badges for bet prompt pot and call values", () => {
    const prompt = generatePrompt("bet", "TrainerBetBadges");

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={vi.fn()} />);

    expect(screen.getByLabelText("Table status")).toHaveTextContent(`Pot ${formatMoney(prompt.pot)}`);
    expect(screen.getByLabelText("Table status")).toHaveTextContent(`Call ${formatMoney(prompt.call)}`);
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
    for (const button of screen.getAllByRole("button")) {
      if (button.classList.contains("answer-button")) {
        await user.click(button);
      }
    }

    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  test("does not call onAnswered again when clicking multiple bet answers after an answer", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("bet", "TrainerBetLock");
    const model = getAnswerModel(prompt);
    if (model.kind !== "bet") {
      throw new Error("Expected bet prompt");
    }
    const firstAction = model.correctAction === "call" ? "Fold" : "Call";
    const onAnswered = vi.fn();

    render(<TrainerView prompt={prompt} onNext={vi.fn()} onAnswered={onAnswered} />);

    await user.click(screen.getByRole("button", { name: firstAction }));
    for (const button of screen.getAllByRole("button")) {
      if (button.classList.contains("answer-button")) {
        await user.click(button);
      }
    }

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
