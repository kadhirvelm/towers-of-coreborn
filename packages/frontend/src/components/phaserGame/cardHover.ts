/** How far a hovered card rises, as a fraction of its height. */
export const CARD_HOVER_LIFT_RATIO = 0.6;

/** Scale applied while a card is lifted out of the hand. */
export const CARD_HOVER_SCALE = 1.1;

/**
 * Exponential time constant for the lift, in milliseconds.
 * About three constants covers most of the travel, so the card settles
 * in roughly a quarter of a second.
 */
export const CARD_HOVER_SETTLE_MS = 90;

export type CardHoverPose = {
  scale: number;
  y: number;
};

export type CardHoverMotion = {
  hover: CardHoverPose;
  lift: number;
  rest: CardHoverPose;
};

/**
 * Resting and hovered poses for one hand card.
 * The lift is a fraction of card height so the card clears the hand
 * at any view size.
 * @param restY - Vertical center of the card in the hand
 * @param cardHeight - Card height in pixels
 * @returns Rest pose, hovered pose, and the pixel distance between them
 */
export function cardHoverMotion(
  restY: number,
  cardHeight: number,
): CardHoverMotion {
  const lift = cardHeight * CARD_HOVER_LIFT_RATIO;

  return {
    hover: {
      scale: CARD_HOVER_SCALE,
      y: restY - lift,
    },
    lift,
    rest: {
      scale: 1,
      y: restY,
    },
  };
}

/**
 * Moves a value toward a target with a frame-rate independent ease.
 * Snaps once the remainder is within `snapDistance`, so the card does
 * not creep for the rest of the battle.
 * @param current - Current value
 * @param target - Value to approach
 * @param deltaMs - Frame time in milliseconds
 * @param settleMs - Time constant; smaller values arrive sooner
 * @param snapDistance - Remaining distance that counts as arrived
 * @returns The next value
 */
export function approach(
  current: number,
  target: number,
  deltaMs: number,
  settleMs: number,
  snapDistance = 0.35,
): number {
  if (settleMs <= 0) {
    return target;
  }
  if (deltaMs <= 0) {
    return current;
  }

  const blended =
    current + (target - current) * (1 - Math.exp(-deltaMs / settleMs));
  if (Math.abs(target - blended) <= snapDistance) {
    return target;
  }
  return blended;
}
