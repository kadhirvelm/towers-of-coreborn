import { describe, expect, test } from "bun:test";
import {
  approach,
  CARD_HOVER_LIFT_RATIO,
  CARD_HOVER_SCALE,
  cardHoverMotion,
} from "../cardHover";

describe("cardHoverMotion", () => {
  test("lifts the card out of the hand and scales it up", () => {
    const motion = cardHoverMotion(500, 180);

    expect(motion.rest.y).toBe(500);
    expect(motion.rest.scale).toBe(1);
    expect(motion.lift).toBe(180 * CARD_HOVER_LIFT_RATIO);
    expect(motion.hover.y).toBe(500 - motion.lift);
    expect(motion.hover.scale).toBe(CARD_HOVER_SCALE);
    expect(motion.hover.y < motion.rest.y).toBe(true);
  });
});

describe("approach", () => {
  test("moves toward the target and snaps once it is close", () => {
    const step = approach(0, 100, 16, 90);

    expect(step > 0).toBe(true);
    expect(step < 100).toBe(true);

    let value = 0;
    for (let frame = 0; frame < 60; frame++) {
      value = approach(value, 100, 16, 90);
    }

    expect(value).toBe(100);
  });

  test("holds when no time has passed and jumps when settle time is zero", () => {
    expect(approach(10, 40, 0, 90)).toBe(10);
    expect(approach(10, 40, 16, 0)).toBe(40);
  });
});
