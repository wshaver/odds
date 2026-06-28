import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  loadProfile,
  recordCampaignAnswer,
  recordCampaignHandDealt,
  recordAnswer,
  resetCampaign,
  resetProfile,
  saveProfile,
} from "./profileStore";

describe("profileStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test("loadProfile creates default versioned profile with both mode stats and answeredPrompts", () => {
    expect(loadProfile()).toEqual({
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
        nextMode: "bet",
        history: [],
      },
      settings: {},
    });
  });

  test("recordCampaignHandDealt charges each hand once and alternates next mode", () => {
    const result = recordCampaignHandDealt({
      promptKey: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=100&call=30&seed=campaign1",
      promptMode: "bet",
    });

    expect(result.dealt).toBe(true);
    expect(result.bankrollDelta).toBe(-10);
    expect(result.profile.campaign).toEqual({
      active: true,
      bankroll: 490,
      handsPlayed: 1,
      nextMode: "chase",
      history: [
        expect.objectContaining({
          promptMode: "bet",
          selected: null,
          correct: null,
          handCost: 10,
          payout: 0,
          bankrollDelta: -10,
          bankrollAfter: 490,
        }),
      ],
    });

    const duplicate = recordCampaignHandDealt({
      promptKey: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=100&call=30&seed=campaign1",
      promptMode: "bet",
    });

    expect(duplicate.dealt).toBe(false);
    expect(duplicate.profile.campaign.bankroll).toBe(490);
    expect(duplicate.profile.campaign.handsPlayed).toBe(1);
  });

  test("recordCampaignAnswer applies payout after the hand cost was charged", () => {
    recordCampaignHandDealt({
      promptKey: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=100&call=30&seed=campaign1",
      promptMode: "bet",
    });

    const result = recordCampaignAnswer({
      promptKey: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=100&call=30&seed=campaign1",
      promptMode: "bet",
      selected: "Call",
      correct: true,
      payout: 24.5,
    });

    expect(result.bankrollDelta).toBe(24.5);
    expect(result.profile.campaign).toEqual({
      active: true,
      bankroll: 514.5,
      handsPlayed: 1,
      nextMode: "chase",
      history: [
        expect.objectContaining({
          promptMode: "bet",
          selected: "Call",
          correct: true,
          handCost: 10,
          payout: 24.5,
          bankrollDelta: 14.5,
          bankrollAfter: 514.5,
        }),
      ],
    });
  });

  test("resetCampaign restores starting bankroll and clears campaign history", () => {
    recordCampaignHandDealt({
      promptKey: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=100&call=30&seed=campaign1",
      promptMode: "bet",
    });

    const profile = resetCampaign();

    expect(profile.campaign).toEqual({
      active: false,
      bankroll: 500,
      handsPlayed: 0,
      nextMode: "bet",
      history: [],
    });
    expect(loadProfile().campaign).toEqual(profile.campaign);
  });


  test("recordAnswer records an answer once per canonical key", () => {
    const first = recordAnswer({
      key: "mode=odds&hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
      mode: "odds",
      selected: "46%",
      correct: true,
    });
    const second = recordAnswer({
      key: "mode=odds&hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
      mode: "odds",
      selected: "46%",
      correct: true,
    });

    expect(first.scored).toBe(true);
    expect(second.scored).toBe(false);
    expect(second.profile.modes.tellMeTheOdds).toEqual({
      answered: 1,
      correct: 1,
      currentStreak: 1,
      bestStreak: 1,
    });
    expect(Object.keys(second.profile.answeredPrompts)).toEqual([
      "mode=odds&hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
    ]);
  });

  test("recordAnswer scores chase answers in the chaseOut bucket", () => {
    const result = recordAnswer({
      key: "mode=chase&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&seed=k4p9",
      mode: "chase",
      selected: "$31",
      correct: true,
    });

    expect(result.scored).toBe(true);
    expect(result.profile.modes.chaseOut).toEqual({
      answered: 1,
      correct: 1,
      currentStreak: 1,
      bestStreak: 1,
    });
    expect(result.profile.modes.tellMeTheOdds.answered).toBe(0);
    expect(result.profile.modes.whatsTheBet.answered).toBe(0);
  });

  test("can reset profile data", () => {
    recordAnswer({
      key: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9",
      mode: "bet",
      selected: "call",
      correct: true,
    });

    resetProfile();

    expect(loadProfile().modes.whatsTheBet).toEqual({
      answered: 0,
      correct: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
    expect(loadProfile().answeredPrompts).toEqual({});
  });

  test("incorrect answer increments answered and resets current streak", () => {
    recordAnswer({
      key: "mode=odds&hero=AsAd&opponent=TdTc&board=8s9dKh&seed=first",
      mode: "odds",
      selected: "90%",
      correct: true,
    });

    const result = recordAnswer({
      key: "mode=odds&hero=AsAd&opponent=TcTh&board=8s9dKh&seed=second",
      mode: "odds",
      selected: "10%",
      correct: false,
    });

    expect(result.profile.modes.tellMeTheOdds).toEqual({
      answered: 2,
      correct: 1,
      currentStreak: 0,
      bestStreak: 1,
    });
  });

  test("corrupt and wrong-version localStorage data return default profile", () => {
    localStorage.setItem("odds.playerProfile.v1", "{bad json");
    expectDefaultProfile(loadProfile());

    localStorage.setItem(
      "odds.playerProfile.v1",
      JSON.stringify({ version: 2, answeredPrompts: { old: {} } }),
    );
    expectDefaultProfile(loadProfile());
  });

  test("malformed version-1 localStorage data returns default profile and recordAnswer still works", () => {
    localStorage.setItem("odds.playerProfile.v1", JSON.stringify({ version: 1 }));

    expectDefaultProfile(loadProfile());

    const result = recordAnswer({
      key: "mode=odds&hero=AsAd&opponent=TdTc&board=8s9dKh&seed=malformed",
      mode: "odds",
      selected: "90%",
      correct: true,
    });

    expect(result.scored).toBe(true);
    expect(result.profile.modes.tellMeTheOdds).toEqual({
      answered: 1,
      correct: 1,
      currentStreak: 1,
      bestStreak: 1,
    });
  });

  test("loadProfile adds default chaseOut stats to old version-1 profiles", () => {
    localStorage.setItem(
      "odds.playerProfile.v1",
      JSON.stringify({
        version: 1,
        modes: {
          tellMeTheOdds: {
            answered: 2,
            correct: 1,
            currentStreak: 0,
            bestStreak: 1,
          },
          whatsTheBet: {
            answered: 3,
            correct: 2,
            currentStreak: 2,
            bestStreak: 2,
          },
        },
        weakSpots: {},
        answeredPrompts: {},
        campaign: {
          active: false,
          bankroll: 500,
          handsPlayed: 0,
          nextMode: "bet",
          history: [],
        },
        settings: {},
      }),
    );

    expect(loadProfile().modes.chaseOut).toEqual({
      answered: 0,
      correct: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  test("loadProfile returns default profile when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expectDefaultProfile(loadProfile());
  });

  test("recordAnswer returns updated profile and scored true when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });

    const result = recordAnswer({
      key: "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=setItem",
      mode: "bet",
      selected: "call",
      correct: true,
    });

    expect(result.scored).toBe(true);
    expect(result.profile.modes.whatsTheBet).toEqual({
      answered: 1,
      correct: 1,
      currentStreak: 1,
      bestStreak: 1,
    });
  });

  test("resetProfile does not throw when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });

    expect(() => resetProfile()).not.toThrow();
  });
});

function expectDefaultProfile(profile: unknown) {
  expect(profile).toEqual({
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
      nextMode: "bet",
      history: [],
    },
    settings: {},
  });
}
