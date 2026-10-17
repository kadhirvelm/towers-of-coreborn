import { describe, expect, test } from "bun:test";
import { layoutBattle, PLACEHOLDER_HAND } from "./battleLayout";

describe("layoutBattle", () => {
  test("puts the cultivator on the left and the enemy on the right", () => {
    const layout = layoutBattle(1280, 800);
    const player = layout.actors.find((actor) => actor.side === "player");
    const enemy = layout.actors.find((actor) => actor.side === "enemy");

    expect(player?.label).toBe("Cultivator");
    expect(enemy?.label).toBe("Enemy");
    expect((player?.x ?? 0) < 640).toBe(true);
    expect((enemy?.x ?? 0) > 640).toBe(true);
    expect(player?.y).toBe(enemy?.y);
  });

  test("lays a five-card hand along the bottom, left to right", () => {
    const layout = layoutBattle(1280, 800);

    expect(layout.cards.map((card) => card.label)).toEqual([
      ...PLACEHOLDER_HAND,
    ]);
    const cardCenters = layout.cards.map((card) => card.x);
    expect(cardCenters).toEqual(
      [...cardCenters].sort((left, right) => left - right),
    );
    expect(new Set(cardCenters).size).toBe(cardCenters.length);

    for (const card of layout.cards) {
      expect(card.y > (layout.actors[0]?.y ?? 0)).toBe(true);
      expect(card.x > 0).toBe(true);
      expect(card.x < 1280).toBe(true);
      expect(card.y + card.height / 2 <= 800).toBe(true);
    }
  });

  test("keeps every coordinate finite for a tiny view", () => {
    const layout = layoutBattle(0, 0);
    const points = [
      ...layout.actors.flatMap((actor) => [actor.x, actor.y, actor.radius]),
      ...layout.cards.flatMap((card) => [
        card.x,
        card.y,
        card.width,
        card.height,
      ]),
    ];

    expect(points.every((value) => Number.isFinite(value))).toBe(true);
  });
});
