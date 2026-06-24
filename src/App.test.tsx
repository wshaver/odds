import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { App } from "./App";
import { canonicalPromptKey, promptToHash } from "./prompts/hashRouter";
import { generatePrompt, getAnswerModel } from "./prompts/questionGenerator";

function optionLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  test("renders a distinct mode bar with progress counters", () => {
    render(<App />);

    const banner = screen.getByRole("banner");
    const main = screen.getByRole("main");

    expect(banner).toBeInTheDocument();
    expect(main).toBeInTheDocument();
    expect(main).not.toContainElement(banner);
    expect(screen.getByRole("navigation", { name: "Training modes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Odds" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bet" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Odds");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Bet");
  });

  test("restores answered prompt feedback from profile storage for the current hash", () => {
    const prompt = generatePrompt("odds", "AppRestoredAnswer");
    const model = getAnswerModel(prompt);
    if (model.kind !== "odds") {
      throw new Error("Expected odds prompt");
    }
    const selected = optionLabel(model.options[0]);
    const key = canonicalPromptKey(prompt);

    localStorage.setItem(
      "odds.playerProfile.v1",
      JSON.stringify({
        version: 1,
        modes: {
          tellMeTheOdds: {
            answered: 1,
            correct: 0,
            currentStreak: 0,
            bestStreak: 0,
          },
          whatsTheBet: {
            answered: 0,
            correct: 0,
            currentStreak: 0,
            bestStreak: 0,
          },
        },
        weakSpots: {},
        answeredPrompts: {
          [key]: {
            mode: "odds",
            answeredAt: "2026-06-22T00:00:00.000Z",
            selected,
            correct: false,
          },
        },
        settings: {},
      }),
    );
    window.history.replaceState(null, "", promptToHash(prompt));

    render(<App />);

    expect(screen.queryByText(/Selected answer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Answer to see the card math/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: selected })).toBeDisabled();
    expect(screen.getByRole("button", { name: selected })).toHaveClass("answer-selected");
  });
});
