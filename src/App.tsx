import { useEffect, useState } from "react";

import { TrainerView, type TrainerAnswer } from "./components/TrainerView";
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./prompts/hashRouter";
import { generatePrompt } from "./prompts/questionGenerator";
import type { Prompt, PromptMode } from "./prompts/types";
import { loadProfile, recordAnswer, type PlayerProfile } from "./profile/profileStore";

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
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const promptKey = canonicalPromptKey(prompt);
  const restoredAnswer = profile.answeredPrompts[promptKey] ?? null;

  useEffect(() => {
    function handleHashChange(): void {
      try {
        setPrompt(parsePromptHash(window.location.hash));
      } catch {
        const fallback = generatePrompt("odds");
        window.history.replaceState(null, "", promptToHash(fallback));
        setPrompt(fallback);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function showPrompt(nextPrompt: Prompt): void {
    setPrompt(nextPrompt);
    const nextHash = promptToHash(nextPrompt);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function switchMode(mode: PromptMode): void {
    showPrompt(generatePrompt(mode));
  }

  function handleAnswered(answer: TrainerAnswer): void {
    const result = recordAnswer({
      key: answer.key,
      mode: prompt.mode,
      selected: answer.selected,
      correct: answer.correct,
    });
    setProfile(result.profile);
  }

  function handleNext(): void {
    showPrompt(generatePrompt(prompt.mode));
  }

  return (
    <div className="app-shell">
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
      <main>
        <TrainerView
          prompt={prompt}
          restoredAnswer={restoredAnswer}
          onAnswered={handleAnswered}
          onNext={handleNext}
        />
      </main>
    </div>
  );
}
