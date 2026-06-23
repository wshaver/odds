import type { PromptMode } from "../prompts/types";

const STORAGE_KEY = "odds.playerProfile.v1";

export type ModeStats = {
  answered: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
};

export type AnsweredPrompt = {
  mode: PromptMode;
  answeredAt: string;
  selected: string;
  correct: boolean;
};

export type PlayerProfile = {
  version: 1;
  modes: {
    tellMeTheOdds: ModeStats;
    whatsTheBet: ModeStats;
  };
  weakSpots: Record<string, { answered: number; correct: number }>;
  answeredPrompts: Record<string, AnsweredPrompt>;
  settings: Record<string, unknown>;
};

export function loadProfile(): PlayerProfile {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === null) {
    return createDefaultProfile();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PlayerProfile>;

    if (parsed.version !== 1) {
      return createDefaultProfile();
    }

    return parsed as PlayerProfile;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function recordAnswer(input: {
  key: string;
  mode: PromptMode;
  selected: string;
  correct: boolean;
}): { profile: PlayerProfile; scored: boolean } {
  const profile = loadProfile();

  if (profile.answeredPrompts[input.key] !== undefined) {
    return { profile, scored: false };
  }

  const modeStats = profile.modes[modeStatsKey(input.mode)];
  modeStats.answered += 1;

  if (input.correct) {
    modeStats.correct += 1;
    modeStats.currentStreak += 1;
    modeStats.bestStreak = Math.max(modeStats.bestStreak, modeStats.currentStreak);
  } else {
    modeStats.currentStreak = 0;
  }

  profile.answeredPrompts[input.key] = {
    mode: input.mode,
    answeredAt: new Date().toISOString(),
    selected: input.selected,
    correct: input.correct,
  };

  saveProfile(profile);

  return { profile, scored: true };
}

export function resetProfile(): void {
  saveProfile(createDefaultProfile());
}

function createDefaultProfile(): PlayerProfile {
  return {
    version: 1,
    modes: {
      tellMeTheOdds: createDefaultModeStats(),
      whatsTheBet: createDefaultModeStats(),
    },
    weakSpots: {},
    answeredPrompts: {},
    settings: {},
  };
}

function createDefaultModeStats(): ModeStats {
  return {
    answered: 0,
    correct: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

function modeStatsKey(mode: PromptMode): keyof PlayerProfile["modes"] {
  return mode === "odds" ? "tellMeTheOdds" : "whatsTheBet";
}
