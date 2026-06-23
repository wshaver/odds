export type ShouldCallInput = {
  pot: number;
  call: number;
  winProbability: number;
};

export function requiredEquity(pot: number, call: number): number {
  if (pot <= 0) {
    throw new Error("Pot must be positive");
  }
  if (call <= 0) {
    throw new Error("Call must be positive");
  }

  return call / (pot + call);
}

export function shouldCall(input: ShouldCallInput): boolean {
  return input.winProbability >= requiredEquity(input.pot, input.call);
}
