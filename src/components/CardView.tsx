import { cardToString, type Card } from "../engine/cards";

const SUIT_SYMBOLS: Record<Card["suit"], string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

export function CardView({ card }: { card: Card }) {
  const colorClass = card.suit === "d" || card.suit === "h" ? "card-red" : "card-black";
  const rankLabel = card.rank === "T" ? "10" : card.rank;

  return (
    <span className={`playing-card ${colorClass}`} aria-label={cardToString(card)}>
      <span className="card-rank">{rankLabel}</span>
      <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
    </span>
  );
}
