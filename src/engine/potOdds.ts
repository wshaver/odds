export type ShouldCallInput = {
  pot: number;
  call: number;
  winProbability: number;
};

export type MaxCorrectCallInput = {
  pot: number;
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

export function maxCorrectCall(input: MaxCorrectCallInput): number {
  if (input.pot <= 0) {
    throw new Error("Pot must be positive");
  }
  if (input.winProbability < 0 || input.winProbability > 1) {
    throw new Error("Win probability must be between 0 and 1");
  }
  if (input.winProbability === 1) {
    return Number.POSITIVE_INFINITY;
  }

  const maxCall = (input.winProbability * input.pot) / (1 - input.winProbability);
  return Math.floor(maxCall + Number.EPSILON * Math.max(1, Math.abs(maxCall)) * 4);
}

export function chaseOutBet(input: MaxCorrectCallInput): number | null {
  if (input.winProbability === 1) {
    return null;
  }

  return maxCorrectCall(input) + 1;
}

export function shouldCall(input: ShouldCallInput): boolean {
  return input.winProbability >= requiredEquity(input.pot, input.call);
}
