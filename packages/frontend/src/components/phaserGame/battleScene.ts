import type Phaser from "phaser";
import { layoutBattle } from "./battleLayout";

const FIELD_COLOR = 0xf3efe4;
const PLAYER_COLOR = 0x3e63dd;
const ENEMY_COLOR = 0xe5484d;
const CARD_FILL = 0xfffdf8;
const CARD_STROKE = 0x8d8d8d;
const INK = "#292f33";

type PhaserRuntime = typeof import("phaser");

/**
 * Builds the battle scene class against a dynamically imported Phaser runtime.
 * Shapes are stand-ins: a blue circle for the cultivator, a red circle for the enemy.
 * @param Phaser - Phaser module namespace
 * @returns Scene class that draws the current battle layout
 */
export function createBattleSceneClass(
  Phaser: PhaserRuntime,
): new () => Phaser.Scene {
  return class BattleScene extends Phaser.Scene {
    private field!: Phaser.GameObjects.Graphics;
    private labels!: Phaser.GameObjects.Container;

    public constructor() {
      super({ key: "BattleScene" });
    }

    /**
     * Creates the drawing layers and redraws whenever the canvas resizes.
     */
    public create(): void {
      this.field = this.add.graphics();
      this.labels = this.add.container(0, 0);
      this.scale.on("resize", this.draw, this);
      this.events.once("shutdown", () => {
        this.scale.off("resize", this.draw, this);
      });
      this.draw();
    }

    /**
     * Clears and repaints actors and cards for the current canvas size.
     */
    private readonly draw = (): void => {
      const layout = layoutBattle(this.scale.width, this.scale.height);
      this.field.clear();
      this.labels.removeAll(true);

      this.field.fillStyle(FIELD_COLOR, 1);
      this.field.fillRect(0, 0, this.scale.width, this.scale.height);

      for (const actor of layout.actors) {
        const color = actor.side === "player" ? PLAYER_COLOR : ENEMY_COLOR;
        this.field.fillStyle(0x000000, 0.12);
        this.field.fillEllipse(
          actor.x,
          actor.y + actor.radius * 0.9,
          actor.radius * 1.7,
          actor.radius * 0.45,
        );
        this.field.fillStyle(color, 1);
        this.field.fillCircle(actor.x, actor.y, actor.radius);
        this.field.lineStyle(4, 0xffffff, 0.85);
        this.field.strokeCircle(actor.x, actor.y, actor.radius);
        this.addLabel(actor.x, actor.y + actor.radius + 22, actor.label, 20);
        this.addLabel(
          actor.x,
          actor.y + actor.radius + 46,
          `HP ${actor.hitPoints}`,
          16,
        );
      }

      for (const card of layout.cards) {
        const left = card.x - card.width / 2;
        const top = card.y - card.height / 2;
        this.field.fillStyle(CARD_FILL, 1);
        this.field.fillRoundedRect(left, top, card.width, card.height, 12);
        this.field.lineStyle(2, CARD_STROKE, 1);
        this.field.strokeRoundedRect(left, top, card.width, card.height, 12);
        this.addLabel(card.x, card.y, card.label, 16);
      }
    };

    /**
     * Adds a centered label to the text layer.
     * @param x - Horizontal center
     * @param y - Vertical center
     * @param text - Label copy
     * @param fontSize - Font size in pixels
     */
    private addLabel(
      x: number,
      y: number,
      text: string,
      fontSize: number,
    ): void {
      const label = this.add.text(x, y, text, {
        color: INK,
        fontFamily: "Georgia, serif",
        fontSize: `${fontSize}px`,
      });
      label.setOrigin(0.5);
      this.labels.add(label);
    }
  };
}
