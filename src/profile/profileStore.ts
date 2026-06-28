import type { PromptMode } from "../prompts/types";

const STORAGE_KEY = "odds.playerProfile.v1";
const CAMPAIGN_STARTING_BANKROLL = 500;
const CAMPAIGN_HAND_COST = 10;

export type CampaignPromptMode = Extract<PromptMode, "bet" | "chase">;

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
    chaseOut: ModeStats;
  };
  weakSpots: Record<string, { answered: number; correct: number }>;
  answeredPrompts: Record<string, AnsweredPrompt>;
  campaign: CampaignState;
  settings: Record<string, unknown>;
};

export type CampaignState = {
  active: boolean;
  bankroll: number;
  handsPlayed: number;
  nextMode: CampaignPromptMode;
  history: CampaignHandResult[];
};

export type CampaignHandResult = {
  promptKey: string;
  promptMode: CampaignPromptMode;
  answeredAt: string;
  selected: string | null;
  correct: boolean | null;
  handCost: number;
  payout: number;
  bankrollDelta: number;
  bankrollAfter: number;
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

export function recordCampaignAnswer(input: {
  promptKey: string;
  promptMode: CampaignPromptMode;
  selected: string;
  correct: boolean;
  payout: number;
}): { profile: PlayerProfile; bankrollDelta: number } {
  let profile = loadProfile();

  if (!profile.campaign.history.some((hand) => hand.promptKey === input.promptKey)) {
    profile = recordCampaignHandDealt({
      promptKey: input.promptKey,
      promptMode: input.promptMode,
    }).profile;
  }

  const payout = roundMoney(input.payout);
  const bankrollAfter = roundMoney(profile.campaign.bankroll + payout);

  profile.campaign = {
    active: profile.campaign.active,
    bankroll: bankrollAfter,
    handsPlayed: profile.campaign.handsPlayed,
    nextMode: profile.campaign.nextMode,
    history: profile.campaign.history.map((hand) =>
      hand.promptKey === input.promptKey
        ? {
            ...hand,
            answeredAt: new Date().toISOString(),
            selected: input.selected,
            correct: input.correct,
            payout,
            bankrollDelta: roundMoney(payout - hand.handCost),
            bankrollAfter,
          }
        : hand,
    ),
  };

  saveProfile(profile);

  return { profile, bankrollDelta: payout };
}

export function recordCampaignHandDealt(input: {
  promptKey: string;
  promptMode: CampaignPromptMode;
}): { profile: PlayerProfile; dealt: boolean; bankrollDelta: number } {
  const profile = loadProfile();

  if (profile.campaign.history.some((hand) => hand.promptKey === input.promptKey)) {
    return { profile, dealt: false, bankrollDelta: 0 };
  }

  const bankrollDelta = -CAMPAIGN_HAND_COST;
  const bankrollAfter = roundMoney(profile.campaign.bankroll + bankrollDelta);

  profile.campaign = {
    active: true,
    bankroll: bankrollAfter,
    handsPlayed: profile.campaign.handsPlayed + 1,
    nextMode: input.promptMode === "bet" ? "chase" : "bet",
    history: [
      ...profile.campaign.history,
      {
        promptKey: input.promptKey,
        promptMode: input.promptMode,
        answeredAt: "",
        selected: null,
        correct: null,
        handCost: CAMPAIGN_HAND_COST,
        payout: 0,
        bankrollDelta,
        bankrollAfter,
      },
    ].slice(-200),
  };

  saveProfile(profile);

  return { profile, dealt: true, bankrollDelta };
}

export function resetProfile(): void {
  saveProfile(createDefaultProfile());
}

export function resetCampaign(): PlayerProfile {
  const profile = loadProfile();
  profile.campaign = createDefaultCampaignState();
  saveProfile(profile);
  return profile;
}

function createDefaultProfile(): PlayerProfile {
  return {
    version: 1,
    modes: {
      tellMeTheOdds: createDefaultModeStats(),
      whatsTheBet: createDefaultModeStats(),
      chaseOut: createDefaultModeStats(),
    },
    weakSpots: {},
    answeredPrompts: {},
    campaign: createDefaultCampaignState(),
    settings: {},
  };
}

function createDefaultCampaignState(): CampaignState {
  return {
    active: false,
    bankroll: CAMPAIGN_STARTING_BANKROLL,
    handsPlayed: 0,
    nextMode: "bet",
    history: [],
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
      chaseOut: isModeStats(profile.modes?.chaseOut)
        ? profile.modes.chaseOut
        : defaults.modes.chaseOut,
    },
    weakSpots: isRecord(profile.weakSpots) ? profile.weakSpots : defaults.weakSpots,
    answeredPrompts: isRecord(profile.answeredPrompts)
      ? profile.answeredPrompts
      : defaults.answeredPrompts,
    campaign: normalizeCampaignState(profile.campaign, defaults.campaign),
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

function normalizeCampaignState(value: unknown, fallback: CampaignState): CampaignState {
  if (!isCampaignStateLike(value)) {
    return fallback;
  }

  return {
    active: typeof value.active === "boolean" ? value.active : value.handsPlayed > 0,
    bankroll: value.bankroll,
    handsPlayed: value.handsPlayed,
    nextMode: value.nextMode,
    history: value.history,
  };
}

function isCampaignStateLike(
  value: unknown,
): value is Omit<CampaignState, "active"> & { active?: unknown } {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isFinite(value.bankroll) &&
    Number.isFinite(value.handsPlayed) &&
    (value.nextMode === "bet" || value.nextMode === "chase") &&
    Array.isArray(value.history) &&
    value.history.every(isCampaignHandResult)
  );
}

function isCampaignHandResult(value: unknown): value is CampaignHandResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.promptKey === "string" &&
    (value.promptMode === "bet" || value.promptMode === "chase") &&
    typeof value.answeredAt === "string" &&
    (typeof value.selected === "string" || value.selected === null) &&
    (typeof value.correct === "boolean" || value.correct === null) &&
    Number.isFinite(value.handCost) &&
    Number.isFinite(value.payout) &&
    Number.isFinite(value.bankrollDelta) &&
    Number.isFinite(value.bankrollAfter)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modeStatsKey(mode: PromptMode): keyof PlayerProfile["modes"] {
  if (mode === "odds") {
    return "tellMeTheOdds";
  }
  if (mode === "chase") {
    return "chaseOut";
  }
  return "whatsTheBet";
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}
