import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { App } from "./App";
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./prompts/hashRouter";
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
    expect(screen.getByRole("heading", { name: "Poker Odds Trainer" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Training modes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Odds" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bet" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Chase" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Campaign" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Odds");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Bet");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Chase");
    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Campaign $500");
  });

  test("campaign button opens a start page before dealing the first hand", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Campaign" }));

    expect(screen.getByRole("button", { name: "Campaign" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Campaign" })).toBeInTheDocument();
    expect(screen.getByText(/Start with \$500/i)).toBeInTheDocument();
    expect(screen.getByText(/Each hand costs \$10/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent("Campaign bankroll $500");

    await user.click(screen.getByRole("button", { name: "Start campaign" }));

    expect(screen.getByRole("heading", { name: "What is the bet?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent("Campaign bankroll $490");

    await user.click(screen.getByRole("button", { name: "Fold" }));

    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent("Campaign bankroll $490");
    expect(screen.getByText(/Campaign result/i)).toHaveTextContent("$0");

    const stored = JSON.parse(localStorage.getItem("odds.playerProfile.v1") ?? "{}");
    expect(stored.campaign.bankroll).toBe(490);
    expect(stored.campaign.handsPlayed).toBe(1);
    expect(stored.campaign.nextMode).toBe("chase");
    expect(stored.campaign.active).toBe(true);
  });

  test("active campaign hides normal mode stats and can quit", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Campaign" }));
    await user.click(screen.getByRole("button", { name: "Start campaign" }));

    expect(screen.queryByLabelText("Mode progress")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Odds" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chase" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quit campaign" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quit campaign" }));

    expect(screen.getByLabelText("Mode progress")).toHaveTextContent("Odds");
    expect(screen.getByRole("button", { name: "Odds" })).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("odds.playerProfile.v1") ?? "{}");
    expect(stored.campaign).toEqual({
      active: false,
      bankroll: 500,
      handsPlayed: 0,
      nextMode: "bet",
      history: [],
    });
  });

  test("correct campaign chase answer earns a pot-sized reward instead of the tiny EV loss", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "odds.playerProfile.v1",
      JSON.stringify({
        version: 1,
        modes: {
          tellMeTheOdds: {
            answered: 0,
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
          chaseOut: {
            answered: 0,
            correct: 0,
            currentStreak: 0,
            bestStreak: 0,
          },
        },
        weakSpots: {},
        answeredPrompts: {},
        campaign: {
          active: false,
          bankroll: 500,
          handsPlayed: 0,
          nextMode: "chase",
          history: [],
        },
        settings: {},
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Campaign" }));
    await user.click(screen.getByRole("button", { name: "Start campaign" }));

    const prompt = parsePromptHash(window.location.hash);
    const model = getAnswerModel(prompt);
    if (prompt.mode !== "chase" || model.kind !== "chase") {
      throw new Error("Expected campaign chase prompt");
    }
    const expectedReward = Math.round(prompt.pot * 0.25);

    expect(expectedReward).toBeGreaterThan(10);
    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent("Campaign bankroll $490");

    await user.click(screen.getByRole("button", { name: `$${model.correctBet.toLocaleString("en-US")}` }));

    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent(
      `Campaign bankroll $${(490 + expectedReward).toLocaleString("en-US")}`,
    );
    expect(screen.getByText(/Campaign result/i)).toHaveTextContent(
      `+$${expectedReward.toLocaleString("en-US")}`,
    );
  });

  test("campaign button returns active players from a shared odds URL to the campaign start page", async () => {
    const user = userEvent.setup();
    const prompt = generatePrompt("odds", "ActiveCampaignSharedOdds");
    window.history.replaceState(null, "", promptToHash(prompt));
    localStorage.setItem(
      "odds.playerProfile.v1",
      JSON.stringify({
        version: 1,
        modes: {
          tellMeTheOdds: {
            answered: 0,
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
          chaseOut: {
            answered: 0,
            correct: 0,
            currentStreak: 0,
            bestStreak: 0,
          },
        },
        weakSpots: {},
        answeredPrompts: {},
        campaign: {
          active: true,
          bankroll: 420,
          handsPlayed: 6,
          nextMode: "chase",
          history: [],
        },
        settings: {},
      }),
    );

    render(<App />);

    expect(screen.queryByLabelText("Mode progress")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campaign" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Campaign" }));

    expect(screen.getByRole("heading", { name: "Campaign" })).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign progress")).toHaveTextContent("Campaign bankroll $420");
    expect(screen.getByRole("button", { name: "Continue campaign" })).toBeInTheDocument();
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
