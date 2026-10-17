import { describe, expect, test } from "bun:test";
import {
  layoutActorPortrait,
  layoutBattle,
  layoutCardPanels,
  layoutHealthBar,
  PLACEHOLDER_HAND,
} from "../battleLayout";

describe("layoutBattle", () => {
  test("puts the player on the left and the enemy on the right", () => {
    const layout = layoutBattle(1280, 800);
    const player = layout.actors.find((actor) => actor.side === "player");
    const enemy = layout.actors.find((actor) => actor.side === "enemy");

    expect(player?.label).toBe("Player");
    expect(player?.hitPoints).toBe(40);
    expect(player?.maxHitPoints).toBe(40);
    expect(enemy?.label).toBe("Enemy");
    expect(enemy?.hitPoints).toBe(28);
    expect(enemy?.maxHitPoints).toBe(28);
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

describe("layoutActorPortrait", () => {
  test("uses a 3:4 frame as tall as the stand-in circle", () => {
    const player = layoutBattle(1280, 800).actors.find(
      (actor) => actor.side === "player",
    );
    expect(player).toBeDefined();
    if (!player) {
      return;
    }

    const portrait = layoutActorPortrait(player);

    expect(portrait.height).toBe(player.radius * 2);
    expect(portrait.width).toBe(portrait.height * 0.75);
    expect(portrait.x).toBe(player.x);
    expect(portrait.y).toBe(player.y);
    expect(portrait.y + portrait.height / 2).toBe(player.y + player.radius);
  });
});

describe("layoutCardPanels", () => {
  test("puts the illustration above the rules caption", () => {
    const card = layoutBattle(1280, 800).cards[0];
    expect(card).toBeDefined();
    if (!card) {
      return;
    }

    const panels = layoutCardPanels(card, {
      rulesLineCount: 3,
      showArt: true,
    });
    expect(panels.art).toBeDefined();
    expect(panels.rules).toBeDefined();
    if (!panels.art || !panels.rules) {
      return;
    }

    expect(panels.art.y + panels.art.height / 2 < panels.rules.y).toBe(true);
    expect(panels.art.x).toBe(card.x);
    expect(panels.rules.x).toBe(card.x);
    expect(
      panels.art.y - panels.art.height / 2 > card.y - card.height / 2,
    ).toBe(true);
    expect(
      panels.rules.y + panels.rules.height / 2 <= card.y + card.height / 2,
    ).toBe(true);
  });

  test("gives the whole inner card to rules when there is no illustration", () => {
    const panels = layoutCardPanels(
      {
        height: 160,
        index: 0,
        label: "Strike",
        width: 100,
        x: 50,
        y: 80,
      },
      { rulesLineCount: 2, showArt: false },
    );

    expect(panels.art).toBeUndefined();
    expect(panels.rules).toEqual({ height: 144, width: 84, x: 50, y: 80 });
  });
});

describe("layoutHealthBar", () => {
  test("labels the player out of 40 and the enemy out of 28", () => {
    const layout = layoutBattle(1280, 800);
    const player = layout.actors.find((actor) => actor.side === "player");
    const enemy = layout.actors.find((actor) => actor.side === "enemy");
    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    if (!player || !enemy) {
      return;
    }

    const playerBar = layoutHealthBar(player);
    const enemyBar = layoutHealthBar(enemy);

    expect(playerBar.label).toBe("40 / 40");
    expect(enemyBar.label).toBe("28 / 28");
    expect(playerBar.fillRatio).toBe(1);
    expect(enemyBar.fillRatio).toBe(1);
    expect(playerBar.y > player.y + player.radius).toBe(true);
    expect(playerBar.x + playerBar.width / 2).toBe(player.x);
    expect(enemyBar.x + enemyBar.width / 2).toBe(enemy.x);
  });

  test("fills the bar from the current hit points", () => {
    const player = layoutBattle(1280, 800).actors.find(
      (actor) => actor.side === "player",
    );
    expect(player).toBeDefined();
    if (!player) {
      return;
    }

    const wounded = layoutHealthBar({ ...player, hitPoints: 10 });

    expect(wounded.label).toBe("10 / 40");
    expect(wounded.fillRatio).toBe(0.25);
  });
});
