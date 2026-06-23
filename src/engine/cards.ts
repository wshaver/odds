export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export type Card = {
  rank: Rank;
  suit: Suit;
};

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function parseCard(value: string): Card {
  if (value.length !== 2) {
    throw new Error(`Invalid card: ${value}`);
  }

  const [rank, suit] = value;

  if (!RANKS.includes(rank as Rank) || !SUITS.includes(suit as Suit)) {
    throw new Error(`Invalid card: ${value}`);
  }

  return { rank: rank as Rank, suit: suit as Suit };
}

export function parseCardList(value: string): Card[] {
  if (value.length % 2 !== 0) {
    throw new Error(`Invalid card list: ${value}`);
  }

  const cards: Card[] = [];
  for (let i = 0; i < value.length; i += 2) {
    cards.push(parseCard(value.slice(i, i + 2)));
  }

  return cards;
}

export function buildDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

export function removeKnownCards(deck: Card[], knownCards: Card[]): Card[] {
  const knownIds = knownCards.map(cardToString);
  const uniqueKnownIds = new Set(knownIds);

  if (uniqueKnownIds.size !== knownIds.length) {
    throw new Error("Duplicate known card");
  }

  return deck.filter((card) => !uniqueKnownIds.has(cardToString(card)));
}
