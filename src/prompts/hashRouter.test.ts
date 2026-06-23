import { describe, expect, test } from "vitest";

import { cardToString } from "../engine/cards";
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./hashRouter";

describe("hashRouter", () => {
  test("parses odds hash into prompt fields", () => {
    const prompt = parsePromptHash(
      "#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9",
    );

    expect(prompt.mode).toBe("odds");
    expect(prompt.hero.map(cardToString)).toEqual(["6s", "7s"]);
    expect(prompt.board.map(cardToString)).toEqual(["8s", "9d", "Kh"]);
    expect(prompt.target).toBe("two-pair");
    expect(prompt.seed).toBe("k4p9");
  });

  test("parses bet hash into prompt fields", () => {
    const prompt = parsePromptHash(
      "#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );

    expect(prompt.mode).toBe("bet");
    if (prompt.mode !== "bet") {
      throw new Error("Expected bet prompt");
    }
    expect(prompt.pot).toBe(120);
    expect(prompt.call).toBe(30);
  });

  test("rejects duplicate cards", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s7s&board=8s9d6s&target=two-pair&seed=k4p9"),
    ).toThrow(/Duplicate card/);
  });

  test("rejects invalid board lengths", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s7s&board=8s9d&target=two-pair&seed=k4p9"),
    ).toThrow(/Odds mode requires 3 or 4 board cards/);

    expect(() =>
      parsePromptHash(
        "#/bet?hero=6s7s&board=8s9dKh&target=trips&pot=120&call=30&seed=k4p9",
      ),
    ).toThrow(/Bet mode requires exactly 4 board cards/);
  });

  test("round trips bet prompt hash and canonical key", () => {
    const hash = "#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9";
    const prompt = parsePromptHash(hash);

    expect(promptToHash(prompt)).toBe(hash);
    expect(canonicalPromptKey(prompt)).toBe(
      "mode=bet&hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );
  });

  test("encodes special characters in seed and parses them back", () => {
    const prompt = parsePromptHash(
      "#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9",
    );

    const hash = promptToHash({ ...prompt, seed: "a&pot=999#x y" });

    expect(hash).toBe(
      "#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=a%26pot%3D999%23x%20y",
    );
    expect(parsePromptHash(hash).seed).toBe("a&pot=999#x y");
  });

  test("canonical prompt keys encode special-character seeds without ambiguity", () => {
    const prompt = parsePromptHash(
      "#/bet?hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=k4p9",
    );

    expect(canonicalPromptKey({ ...prompt, seed: "a&pot=999#x y" })).toBe(
      "mode=bet&hero=6s7s&board=8s9dKh2s&target=trips&pot=120&call=30&seed=a%26pot%3D999%23x%20y",
    );
  });

  test("rejects duplicate known prompt parameters", () => {
    expect(() =>
      parsePromptHash(
        "#/odds?hero=6s7s&hero=AsAd&board=8s9dKh&target=two-pair&seed=k4p9",
      ),
    ).toThrow(/Duplicate parameter: hero/);
  });
});
