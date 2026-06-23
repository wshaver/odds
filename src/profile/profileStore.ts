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
  let stored: string | null;

  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultProfile();
  }

  if (stored === null) {
    return createDefaultProfile();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PlayerProfile>;

    if (parsed.version !== 1) {
      return createDefaultProfile();
    }

    return normalizeProfile(parsed);
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage may be unavailable or full. Keep the in-memory profile usable.
  }
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

function normalizeProfile(profile: Partial<PlayerProfile>): PlayerProfile {
  const defaults = createDefaultProfile();

  return {
    version: 1,
    modes: {
      tellMeTheOdds: isModeStats(profile.modes?.tellMeTheOdds)
        ? profile.modes.tellMeTheOdds
        : defaults.modes.tellMeTheOdds,
      whatsTheBet: isModeStats(profile.modes?.whatsTheBet)
        ? profile.modes.whatsTheBet
        : defaults.modes.whatsTheBet,
    },
    weakSpots: isRecord(profile.weakSpots) ? profile.weakSpots : defaults.weakSpots,
    answeredPrompts: isRecord(profile.answeredPrompts)
      ? profile.answeredPrompts
      : defaults.answeredPrompts,
    settings: isRecord(profile.settings) ? profile.settings : defaults.settings,
  };
}

function isModeStats(value: unknown): value is ModeStats {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isFinite(value.answered) &&
    Number.isFinite(value.correct) &&
    Number.isFinite(value.currentStreak) &&
    Number.isFinite(value.bestStreak)
  );
}

function isRecord(value: unknown): value is Record<string, never> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modeStatsKey(mode: PromptMode): keyof PlayerProfile["modes"] {
  return mode === "odds" ? "tellMeTheOdds" : "whatsTheBet";
}
