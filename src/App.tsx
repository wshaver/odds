import { useEffect, useState } from "react";

import { TrainerView, type TrainerAnswer } from "./components/TrainerView";
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./prompts/hashRouter";
import { generatePrompt, getAnswerModel } from "./prompts/questionGenerator";
import type { Prompt, PromptMode } from "./prompts/types";
import {
  loadProfile,
  recordAnswer,
  recordCampaignAnswer,
  recordCampaignHandDealt,
  resetCampaign,
  type CampaignPromptMode,
  type PlayerProfile,
} from "./profile/profileStore";

type AppMode = PromptMode | "campaign" | "campaignStart";

type CampaignFeedback = {
  promptKey: string;
  bankroll: number;
  bankrollDelta: number;
};

function initialPrompt(): Prompt {
  try {
    if (window.location.hash !== "") {
      return parsePromptHash(window.location.hash);
    }
  } catch {
    // Invalid shared links fall back to a fresh odds prompt below.
  }

  const prompt = generatePrompt("odds");
  window.history.replaceState(null, "", promptToHash(prompt));
  return prompt;
}

export function App() {
  const [prompt, setPrompt] = useState<Prompt>(() => initialPrompt());
  const [appMode, setAppMode] = useState<AppMode>(prompt.mode);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [campaignFeedback, setCampaignFeedback] = useState<CampaignFeedback | null>(null);
  const promptKey = canonicalPromptKey(prompt);
  const restoredAnswer = profile.answeredPrompts[promptKey] ?? null;
  const campaignChromeVisible = appMode === "campaign" || appMode === "campaignStart" || profile.campaign.active;

  useEffect(() => {
    function handleHashChange(): void {
      try {
        const parsedPrompt = parsePromptHash(window.location.hash);
        setPrompt(parsedPrompt);
        setAppMode(parsedPrompt.mode);
        setCampaignFeedback(null);
      } catch {
        const fallback = generatePrompt("odds");
        window.history.replaceState(null, "", promptToHash(fallback));
        setPrompt(fallback);
        setAppMode("odds");
        setCampaignFeedback(null);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function showPrompt(nextPrompt: Prompt): void {
    setPrompt(nextPrompt);
    setCampaignFeedback(null);
    const nextHash = promptToHash(nextPrompt);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  function switchMode(mode: PromptMode): void {
    setAppMode(mode);
    showPrompt(generatePrompt(mode));
  }

  function switchToCampaign(): void {
    setCampaignFeedback(null);
    setAppMode("campaignStart");
  }

  function startOrContinueCampaign(): void {
    setAppMode("campaign");
    dealCampaignPrompt(generatePrompt(profile.campaign.nextMode));
  }

  function quitCampaign(): void {
    const nextProfile = resetCampaign();
    setProfile(nextProfile);
    setAppMode("odds");
    showPrompt(generatePrompt("odds"));
  }

  function dealCampaignPrompt(nextPrompt: Prompt): void {
    if (!isCampaignPromptMode(nextPrompt.mode)) {
      showPrompt(nextPrompt);
      return;
    }

    const result = recordCampaignHandDealt({
      promptKey: canonicalPromptKey(nextPrompt),
      promptMode: nextPrompt.mode,
    });

    setProfile(result.profile);
    showPrompt(nextPrompt);
  }

  function handleAnswered(answer: TrainerAnswer): void {
    const result = recordAnswer({
      key: answer.key,
      mode: prompt.mode,
      selected: answer.selected,
      correct: answer.correct,
    });

    if (appMode === "campaign" && isCampaignPromptMode(prompt.mode)) {
      const campaignResult = recordCampaignAnswer({
        promptKey: answer.key,
        promptMode: prompt.mode,
        selected: answer.selected,
        correct: answer.correct,
        payout: campaignPayout(prompt, answer),
      });

      setCampaignFeedback({
        promptKey: answer.key,
        bankroll: campaignResult.profile.campaign.bankroll,
        bankrollDelta: campaignResult.bankrollDelta,
      });
      setProfile(campaignResult.profile);
      return;
    }

    setProfile(result.profile);
  }

  function handleNext(): void {
    if (appMode === "campaign") {
      dealCampaignPrompt(generatePrompt(profile.campaign.nextMode));
      return;
    }

    showPrompt(generatePrompt(prompt.mode));
  }

  return (
    <div className="app-shell">
      <header className="top-bar" role="banner">
        <div className="brand-block">
          <h1>Poker Odds Trainer</h1>
          {campaignChromeVisible ? null : (
            <div className="stats-line" aria-label="Mode progress">
              <span>
                Odds {profile.modes.tellMeTheOdds.correct}/
                {profile.modes.tellMeTheOdds.answered}
              </span>
              <span>
                Bet {profile.modes.whatsTheBet.correct}/
                {profile.modes.whatsTheBet.answered}
              </span>
              <span>
                Chase {profile.modes.chaseOut.correct}/
                {profile.modes.chaseOut.answered}
              </span>
              <span>Campaign {formatMoneyAmount(profile.campaign.bankroll)}</span>
            </div>
          )}
        </div>
        <nav className="mode-buttons" aria-label="Training modes">
          {campaignChromeVisible ? null : (
            <>
              <button
                aria-pressed={appMode === "odds"}
                onClick={() => switchMode("odds")}
                type="button"
              >
                Odds
              </button>
              <button
                aria-pressed={appMode === "bet"}
                onClick={() => switchMode("bet")}
                type="button"
              >
                Bet
              </button>
              <button
                aria-pressed={appMode === "chase"}
                onClick={() => switchMode("chase")}
                type="button"
              >
                Chase
              </button>
            </>
          )}
          <button
            aria-pressed={appMode === "campaign" || appMode === "campaignStart"}
            onClick={switchToCampaign}
            type="button"
          >
            Campaign
          </button>
          {campaignChromeVisible ? (
            <button onClick={quitCampaign} type="button">
              Quit campaign
            </button>
          ) : null}
        </nav>
      </header>
      <main>
        {appMode === "campaignStart" ? (
          <section className="campaign-start" aria-label="Campaign start">
            <h2>Campaign</h2>
            <p>Start with $500 and build your bankroll through alternating Bet and Chase hands.</p>
            <ul>
              <li>Each hand costs $10 before the cards are dealt.</li>
              <li>Bet hands pay the Call EV when you choose Call.</li>
              <li>Correct Chase hands pay 25% of the pot, rounded to the nearest dollar.</li>
            </ul>
            <div className="campaign-progress" aria-label="Campaign progress">
              <div className="campaign-brief">
                <strong>{profile.campaign.active ? "Continue your run" : "Ready to start"}</strong>
                <span>Campaign bankroll {formatMoneyAmount(profile.campaign.bankroll)}</span>
              </div>
              <div className="campaign-metrics" aria-label="Campaign metrics">
                <span>Hands {profile.campaign.handsPlayed}</span>
                <span>Next {titleCase(profile.campaign.nextMode)}</span>
              </div>
              <button
                className="campaign-restart-button"
                onClick={startOrContinueCampaign}
                type="button"
              >
                {profile.campaign.active ? "Continue campaign" : "Start campaign"}
              </button>
            </div>
          </section>
        ) : null}
        {appMode === "campaign" ? (
          <section className="campaign-progress" aria-label="Campaign progress">
            <div className="campaign-brief">
              <strong>Build your bankroll</strong>
              <span>Each hand costs $10. Bet and Chase alternate.</span>
            </div>
            <div className="campaign-metrics" aria-label="Campaign metrics">
              <span>Campaign bankroll {formatMoneyAmount(profile.campaign.bankroll)}</span>
              <span>Hands {profile.campaign.handsPlayed}</span>
              <span>Next {titleCase(profile.campaign.nextMode)}</span>
            </div>
          </section>
        ) : null}
        {appMode === "campaignStart" ? null : (
          <TrainerView
            prompt={prompt}
            campaignFeedback={campaignFeedback}
            restoredAnswer={restoredAnswer}
            onAnswered={handleAnswered}
            onNext={handleNext}
          />
        )}
      </main>
    </div>
  );
}

function isCampaignPromptMode(mode: PromptMode): mode is CampaignPromptMode {
  return mode === "bet" || mode === "chase";
}

function campaignPayout(prompt: Prompt, answer: TrainerAnswer): number {
  const answerModel = getAnswerModel(prompt);

  if (answerModel.kind === "bet") {
    return answer.selected === "Call" ? answerModel.callExpectedValue : 0;
  }

  if (answerModel.kind === "chase" && prompt.mode === "chase") {
    return answer.correct ? Math.round(prompt.pot * 0.25) : 0;
  }

  return 0;
}

function formatMoneyAmount(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
