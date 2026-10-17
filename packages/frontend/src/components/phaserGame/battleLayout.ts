/** Stand-in combatants until generated character art exists. */
export const PLACEHOLDER_ACTORS = [
  { hitPoints: 40, label: "Cultivator", side: "player" },
  { hitPoints: 28, label: "Enemy", side: "enemy" },
] as const;

/** Stand-in opening hand. Five cards is the fixed hand size. */
export const PLACEHOLDER_HAND = [
  "Strike",
  "Guard",
  "Channel",
  "Draw",
  "Aether",
] as const;

export type ActorSide = (typeof PLACEHOLDER_ACTORS)[number]["side"];

export type ActorSlot = {
  hitPoints: number;
  label: string;
  radius: number;
  side: ActorSide;
  x: number;
  y: number;
};

export type CardSlot = {
  height: number;
  index: number;
  label: string;
  width: number;
  x: number;
  y: number;
};

export type BattleLayout = {
  actors: ActorSlot[];
  cards: CardSlot[];
};

/**
 * Places the party on the left, the enemy on the right, and the hand along the bottom.
 * @param width - Battle view width in pixels
 * @param height - Battle view height in pixels
 * @returns Actor and card slots for the current view size
 */
export function layoutBattle(width: number, height: number): BattleLayout {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const fieldY = safeHeight * 0.4;
  const radius = Math.min(safeWidth, safeHeight) * 0.09;
  const bottomMargin = Math.min(28, safeHeight * 0.04);
  const maxCardHeight = Math.max(
    48,
    safeHeight - bottomMargin - (fieldY + radius + 24),
  );
  const preferredWidth = Math.min(128, Math.max(72, safeWidth * 0.12));
  const cardHeight = Math.min(preferredWidth * 1.45, maxCardHeight);
  const cardWidth = cardHeight / 1.45;
  const gap = Math.max(12, cardWidth * 0.14);
  const handSpan =
    PLACEHOLDER_HAND.length * cardWidth + (PLACEHOLDER_HAND.length - 1) * gap;
  const firstCenterX = (safeWidth - handSpan) / 2 + cardWidth / 2;
  const cardY = safeHeight - bottomMargin - cardHeight / 2;

  return {
    actors: PLACEHOLDER_ACTORS.map((actor) => ({
      hitPoints: actor.hitPoints,
      label: actor.label,
      radius,
      side: actor.side,
      x: actor.side === "player" ? safeWidth * 0.22 : safeWidth * 0.78,
      y: fieldY,
    })),
    cards: PLACEHOLDER_HAND.map((label, index) => ({
      height: cardHeight,
      index,
      label,
      width: cardWidth,
      x: firstCenterX + index * (cardWidth + gap),
      y: cardY,
    })),
  };
}
