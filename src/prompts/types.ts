import type { Card } from "../engine/cards";
import type { HandCategory } from "../engine/handEvaluator";

export type PromptMode = "odds" | "bet";

export type BasePrompt = {
  mode: PromptMode;
  hero: Card[];
  board: Card[];
  target: HandCategory;
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

export type Prompt = OddsPrompt | BetPrompt;
