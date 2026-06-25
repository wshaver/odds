import type { Card } from "../engine/cards";

export type PromptMode = "odds" | "bet" | "chase";

export type BasePrompt = {
  mode: PromptMode;
  hero: Card[];
  opponent: Card[];
  board: Card[];
  seed: string;
};

export type OddsPrompt = BasePrompt & {
  mode: "odds";
};

export type BetPrompt = BasePrompt & {
  mode: "bet";
  pot: number;
  call: number;
};

export type ChasePrompt = BasePrompt & {
  mode: "chase";
  pot: number;
};

export type Prompt = OddsPrompt | BetPrompt | ChasePrompt;
