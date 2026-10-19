import { BATTLE_LOADOUT } from "./battleLoadout";

/** Combatants from `battleLoadout.ts`. Names and hit points are edited there. */
export const PLACEHOLDER_ACTORS = [
  {
    hitPoints: BATTLE_LOADOUT.player.hitPoints,
    label: BATTLE_LOADOUT.player.name,
    maxHitPoints: BATTLE_LOADOUT.player.maxHitPoints,
    side: "player",
  },
  {
    hitPoints: BATTLE_LOADOUT.enemy.hitPoints,
    label: BATTLE_LOADOUT.enemy.name,
    maxHitPoints: BATTLE_LOADOUT.enemy.maxHitPoints,
    side: "enemy",
  },
] as const;

/** Opening hand from `battleLoadout.ts`, left to right. */
export const PLACEHOLDER_HAND = BATTLE_LOADOUT.cards.map(
  (card) => card.rules.name,
);

export type ActorSide = (typeof PLACEHOLDER_ACTORS)[number]["side"];

export type ActorSlot = {
  hitPoints: number;
  label: string;
  maxHitPoints: number;
  radius: number;
  side: ActorSide;
  x: number;
  y: number;
};

export type HealthBarLayout = {
  fillRatio: number;
  height: number;
  label: string;
  width: number;
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

/** A rectangle described by its center, used for portraits and card panels. */
export type LayoutRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

/** Illustration and rules areas inside one card. Either may be omitted. */
export type CardPanels = {
  art?: LayoutRect;
  rules?: LayoutRect;
};

export type BattleLayout = {
  actors: ActorSlot[];
  cards: CardSlot[];
};

/** Live hit points and hand labels passed into `layoutBattle`. */
export interface BattleLayoutSnapshot {
  enemyHitPoints: number;
  hand: readonly string[];
  playerHitPoints: number;
}

/**
 * Places the party on the left, the enemy on the right, and the hand along the bottom.
 * @param width - Battle view width in pixels
 * @param height - Battle view height in pixels
 * @param snapshot - Current hit points and hand. Defaults to the opening loadout
 * @returns Actor and card slots for the current view size
 */
export function layoutBattle(
  width: number,
  height: number,
  snapshot?: BattleLayoutSnapshot,
): BattleLayout {
  const hand = snapshot?.hand ?? PLACEHOLDER_HAND;
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
  const handSpan = hand.length * cardWidth + Math.max(0, hand.length - 1) * gap;
  const firstCenterX = (safeWidth - handSpan) / 2 + cardWidth / 2;
  const cardY = safeHeight - bottomMargin - cardHeight / 2;

  return {
    actors: PLACEHOLDER_ACTORS.map((actor) => ({
      hitPoints: hitPointsFor(actor.side, actor.hitPoints, snapshot),
      label: actor.label,
      maxHitPoints: actor.maxHitPoints,
      radius,
      side: actor.side,
      x: actor.side === "player" ? safeWidth * 0.22 : safeWidth * 0.78,
      y: fieldY,
    })),
    cards: hand.map((label, index) => ({
      height: cardHeight,
      index,
      label,
      width: cardWidth,
      x: firstCenterX + index * (cardWidth + gap),
      y: cardY,
    })),
  };
}

/**
 * @param side - Which combatant
 * @param fallback - Hit points from the loadout
 * @param snapshot - Live hit points, when the battle has started
 * @returns The hit points to draw
 */
function hitPointsFor(
  side: ActorSide,
  fallback: number,
  snapshot: BattleLayoutSnapshot | undefined,
): number {
  if (snapshot === undefined) {
    return fallback;
  }
  if (side === "player") {
    return snapshot.playerHitPoints;
  }
  return snapshot.enemyHitPoints;
}

const HEALTH_BAR_HEIGHT = 20;
const CARD_PANEL_PADDING = 8;
const CARD_RULES_LINE_HEIGHT = 15;
const CARD_PANEL_GAP = 6;

/**
 * 3:4 portrait box centered on the actor, matching generated character art.
 * The box is as tall as the stand-in circle so the name and health bar stay put.
 * @param actor - Actor slot
 * @returns Portrait center and size
 */
export function layoutActorPortrait(actor: ActorSlot): LayoutRect {
  const height = actor.radius * 2;
  const width = height * (3 / 4);
  return { height, width, x: actor.x, y: actor.y };
}

/**
 * Splits a card into an illustration on top and a rules caption underneath.
 * The caption is as tall as its line count, and at most half the card.
 * @param card - Card slot from `layoutBattle`
 * @param options.showArt - Whether an illustration will be drawn
 * @param options.rulesLineCount - Caption lines. Zero omits the caption
 * @returns Centers and sizes of the panels that should be drawn
 */
export function layoutCardPanels(
  card: CardSlot,
  options: { rulesLineCount: number; showArt: boolean },
): CardPanels {
  const innerWidth = card.width - CARD_PANEL_PADDING * 2;
  const innerHeight = card.height - CARD_PANEL_PADDING * 2;
  if (innerWidth <= 0 || innerHeight <= 0) {
    return {};
  }

  const inner: LayoutRect = {
    height: innerHeight,
    width: innerWidth,
    x: card.x,
    y: card.y,
  };
  if (!options.showArt && options.rulesLineCount <= 0) {
    return {};
  }
  if (!options.showArt) {
    return { rules: inner };
  }
  if (options.rulesLineCount <= 0) {
    return { art: inner };
  }

  const preferredRulesHeight = Math.max(
    28,
    8 + options.rulesLineCount * CARD_RULES_LINE_HEIGHT,
  );
  const rulesHeight = Math.min(innerHeight * 0.5, preferredRulesHeight);
  const artHeight = innerHeight - CARD_PANEL_GAP - rulesHeight;
  if (artHeight < 8) {
    return { rules: inner };
  }

  const top = card.y - card.height / 2 + CARD_PANEL_PADDING;
  return {
    art: {
      height: artHeight,
      width: innerWidth,
      x: card.x,
      y: top + artHeight / 2,
    },
    rules: {
      height: rulesHeight,
      width: innerWidth,
      x: card.x,
      y: top + artHeight + CARD_PANEL_GAP + rulesHeight / 2,
    },
  };
}

/**
 * Places a health bar just under an actor and labels it `current / max`.
 * @param actor - Actor the bar belongs to
 * @returns Bar rectangle, fill ratio, and the hit-point label
 */
export function layoutHealthBar(actor: ActorSlot): HealthBarLayout {
  const width = Math.max(96, actor.radius * 2.5);
  const maxHitPoints = Math.max(actor.maxHitPoints, 1);
  const hitPoints = Math.min(Math.max(actor.hitPoints, 0), maxHitPoints);

  return {
    fillRatio: hitPoints / maxHitPoints,
    height: HEALTH_BAR_HEIGHT,
    label: `${hitPoints} / ${maxHitPoints}`,
    width,
    x: actor.x - width / 2,
    y: actor.y + actor.radius + 36,
  };
}
