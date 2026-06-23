import { describe, expect, test } from "vitest";

import { choice, createSeededRandom, shuffle } from "./seededRandom";

describe("seededRandom", () => {
  test("same seed produces same random sequence", () => {
    const first = createSeededRandom("k4p9");
    const second = createSeededRandom("k4p9");

    expect([first(), first(), first(), first()]).toEqual([
      second(),
      second(),
      second(),
      second(),
    ]);
  });

  test("shuffle and choice are deterministic", () => {
    expect(shuffle(["a", "b", "c", "d", "e"], "k4p9")).toEqual(
      shuffle(["a", "b", "c", "d", "e"], "k4p9"),
    );
    expect(choice(["a", "b", "c"], "k4p9")).toBe(choice(["a", "b", "c"], "k4p9"));
  });

  test("shuffle returns a shuffled copy without mutating input", () => {
    const items = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(items, "k4p9");

    expect(items).toEqual(["a", "b", "c", "d", "e"]);
    expect(shuffled).not.toBe(items);
    expect(shuffled).toHaveLength(items.length);
    expect(new Set(shuffled)).toEqual(new Set(items));
  });

  test("choice rejects empty lists", () => {
    expect(() => choice([], "k4p9")).toThrow(/Cannot choose from empty list/);
  });
});
