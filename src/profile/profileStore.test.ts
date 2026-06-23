import { beforeEach, describe, expect, test } from "vitest";

import {
  loadProfile,
  recordAnswer,
  resetProfile,
  saveProfile,
} from "./profileStore";

describe("profileStore", () => {
  beforeEach(() => {
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
      },
      weakSpots: {},
      answeredPrompts: {},
      settings: {},
    });
  });

  test("recordAnswer records an answer once per canonical key", () => {
    const first = recordAnswer({
      key: "mode=odds&hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9",
      mode: "odds",
      selected: "46%",
      correct: true,
    });
    const second = recordAnswer({
      key: "mode=odds&hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9",
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
      "mode=odds&hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9",
    ]);
  });

  test("can reset profile data", () => {
    recordAnswer({
      key: "mode=bet&hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
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
      key: "mode=odds&hero=AsAd&board=8s9dKh&target=pair&seed=first",
      mode: "odds",
      selected: "90%",
      correct: true,
    });

    const result = recordAnswer({
      key: "mode=odds&hero=AsAd&board=8s9dKh&target=pair&seed=second",
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
    },
    weakSpots: {},
    answeredPrompts: {},
    settings: {},
  });
}
