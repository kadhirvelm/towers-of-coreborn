import type Phaser from "phaser";
import {
  cardImageKey,
  cardManifestKey,
  ENEMY_IMAGE_KEY,
  listBattleAssetRequests,
  PLAYER_IMAGE_KEY,
} from "./battleAssetRequests";
import {
  type ActorSlot,
  type CardSlot,
  layoutActorPortrait,
  layoutBattle,
  layoutCardPanels,
  layoutHealthBar,
} from "./battleLayout";
import { BATTLE_LOADOUT } from "./battleLoadout";
import { approach, CARD_HOVER_SETTLE_MS, cardHoverMotion } from "./cardHover";
import { containedScale } from "./containedScale";
import {
  type BattleCardRules,
  formatBattleCardRules,
  parsePlayableCardManifest,
} from "./parsePlayableCardManifest";

const FIELD_COLOR = 0xf3efe4;
const PLAYER_COLOR = 0x3e63dd;
const ENEMY_COLOR = 0xe5484d;
const CARD_FILL = 0xfffdf8;
const CARD_STROKE = 0x8d8d8d;
const BAR_TRACK = 0xd7d1c4;
const INK = "#292f33";
const PAPER = "#fffdf8";
const HOVER_DEPTH = 100;

type PhaserRuntime = typeof import("phaser");

type HandCard = {
  container: Phaser.GameObjects.Container;
  height: number;
  hit: Phaser.Geom.Rectangle;
  hoverScale: number;
  hoverY: number;
  index: number;
  lift: number;
  restY: number;
  targetScale: number;
  targetY: number;
  width: number;
};

/**
 * How many caption lines to reserve for a card.
 * Effect text can wrap, so each effect gets two lines.
 * @param rules - Parsed manifest, when one loaded
 * @param hasArt - Whether the card illustration is in the texture cache
 * @returns Line count for `layoutCardPanels`. Zero means the card has no caption
 */
function captionLineCount(
  rules: BattleCardRules | undefined,
  hasArt: boolean,
): number {
  if (rules) {
    return 1 + rules.effects.length * 2;
  }
  if (hasArt) {
    return 1;
  }
  return 0;
}

/**
 * Builds the battle scene class against a dynamically imported Phaser runtime.
 * Blank loadout URLs keep the colored stand-ins. Filled URLs draw portraits,
 * card art, and the rules from each card's manifest.
 * @param Phaser - Phaser module namespace
 * @returns Scene class that draws the current battle layout
 */
export function createBattleSceneClass(
  Phaser: PhaserRuntime,
): new () => Phaser.Scene {
  return class BattleScene extends Phaser.Scene {
    private art!: Phaser.GameObjects.Container;
    private cardRules: Array<BattleCardRules | undefined> = [];
    private field!: Phaser.GameObjects.Graphics;
    private hand: HandCard[] = [];
    private labels!: Phaser.GameObjects.Container;

    public constructor() {
      super({ key: "BattleScene" });
    }

    /**
     * Queues portraits, card art, and card manifests from `battleLoadout.ts`.
     */
    public preload(): void {
      this.load.setCORS("anonymous");
      this.load.on("loaderror", this.onAssetLoadError);
      for (const asset of listBattleAssetRequests(BATTLE_LOADOUT)) {
        if (asset.kind === "image") {
          this.load.image(asset.key, asset.url);
          continue;
        }
        this.load.json(asset.key, asset.url);
      }
    }

    /**
     * Creates the drawing layers and redraws whenever the canvas resizes.
     */
    public create(): void {
      this.cardRules = this.readCardRules();
      this.field = this.add.graphics();
      this.art = this.add.container(0, 0);
      this.labels = this.add.container(0, 0);
      this.scale.on("resize", this.draw, this);
      this.events.once("shutdown", () => {
        this.load.off("loaderror", this.onAssetLoadError);
        this.scale.off("resize", this.draw, this);
      });
      this.draw();
    }

    /**
     * Eases each card toward its rest or hovered pose.
     * @param _time - Scene time in milliseconds
     * @param delta - Frame time in milliseconds
     */
    public update(_time: number, delta: number): void {
      for (const card of this.hand) {
        const y = approach(
          card.container.y,
          card.targetY,
          delta,
          CARD_HOVER_SETTLE_MS,
        );
        const scale = approach(
          card.container.scaleX,
          card.targetScale,
          delta,
          CARD_HOVER_SETTLE_MS,
          0.002,
        );
        card.container.setPosition(card.container.x, y);
        card.container.setScale(scale);
        if (card.targetY === card.restY && y === card.restY) {
          card.container.setDepth(card.index);
        }
      }
    }

    /**
     * Logs a loadout URL Phaser could not fetch. The slot keeps its stand-in.
     * @param file - Loader file that failed
     */
    private readonly onAssetLoadError = (file: {
      key: string;
      url: string;
    }): void => {
      // biome-ignore lint/suspicious/noConsole: a bad hardcoded asset URL should be visible in devtools
      console.warn(`Could not load battle asset ${file.key} from ${file.url}`);
    };

    /**
     * Reads each queued manifest out of the JSON cache.
     * @returns Rules aligned with the hand, or `undefined` for a missing file
     */
    private readCardRules(): Array<BattleCardRules | undefined> {
      return BATTLE_LOADOUT.cards.map((_, index) => {
        const key = cardManifestKey(index);
        if (!this.cache.json.exists(key)) {
          return undefined;
        }
        return parsePlayableCardManifest(this.cache.json.get(key));
      });
    }

    /**
     * Clears and repaints actors and cards for the current canvas size.
     */
    private readonly draw = (): void => {
      const layout = layoutBattle(this.scale.width, this.scale.height);
      this.field.clear();
      this.art.removeAll(true);
      this.labels.removeAll(true);
      this.clearHand();

      this.field.fillStyle(FIELD_COLOR, 1);
      this.field.fillRect(0, 0, this.scale.width, this.scale.height);

      for (const actor of layout.actors) {
        this.drawActor(actor);
      }
      for (const card of layout.cards) {
        this.drawCardShadow(card);
        this.hand.push(this.createHandCard(card));
      }
    };

    /**
     * Destroys the current hand before a resize repaint.
     */
    private clearHand(): void {
      for (const card of this.hand) {
        card.container.destroy();
      }
      this.hand = [];
    }

    /**
     * Draws one combatant: portrait or circle, name, and health bar.
     * @param actor - Positioned combatant
     */
    private drawActor(actor: ActorSlot): void {
      const imageKey =
        actor.side === "player" ? PLAYER_IMAGE_KEY : ENEMY_IMAGE_KEY;
      this.drawActorShadow(actor);
      if (this.textures.exists(imageKey)) {
        this.drawActorPortrait(actor, imageKey);
      } else {
        this.drawActorCircle(actor);
      }
      this.addLabel(actor.x, actor.y + actor.radius + 10, actor.label, 18);
      this.drawHealthBar(actor);
    }

    /**
     * @param actor - Combatant the shadow sits under
     */
    private drawActorShadow(actor: ActorSlot): void {
      this.field.fillStyle(0x000000, 0.12);
      this.field.fillEllipse(
        actor.x,
        actor.y + actor.radius * 0.9,
        actor.radius * 1.7,
        actor.radius * 0.45,
      );
    }

    /**
     * @param actor - Combatant without a loaded portrait
     */
    private drawActorCircle(actor: ActorSlot): void {
      const color = actor.side === "player" ? PLAYER_COLOR : ENEMY_COLOR;
      this.field.fillStyle(color, 1);
      this.field.fillCircle(actor.x, actor.y, actor.radius);
      this.field.lineStyle(4, 0xffffff, 0.85);
      this.field.strokeCircle(actor.x, actor.y, actor.radius);
    }

    /**
     * @param actor - Combatant whose portrait is in the texture cache
     * @param imageKey - Texture key queued for this side
     */
    private drawActorPortrait(actor: ActorSlot, imageKey: string): void {
      const portrait = layoutActorPortrait(actor);
      this.field.lineStyle(4, 0xffffff, 0.9);
      this.field.strokeRect(
        portrait.x - portrait.width / 2,
        portrait.y - portrait.height / 2,
        portrait.width,
        portrait.height,
      );
      this.addContainedImage(
        imageKey,
        portrait.x,
        portrait.y,
        portrait.width,
        portrait.height,
      );
    }

    /**
     * @param actor - Combatant the bar belongs to
     */
    private drawHealthBar(actor: ActorSlot): void {
      const bar = layoutHealthBar(actor);
      this.field.fillStyle(BAR_TRACK, 1);
      this.field.fillRect(bar.x, bar.y, bar.width, bar.height);
      const fillWidth = bar.width * bar.fillRatio;
      if (fillWidth > 0) {
        const color = actor.side === "player" ? PLAYER_COLOR : ENEMY_COLOR;
        this.field.fillStyle(color, 1);
        this.field.fillRect(bar.x, bar.y, fillWidth, bar.height);
      }
      this.field.lineStyle(2, CARD_STROKE, 1);
      this.field.strokeRect(bar.x, bar.y, bar.width, bar.height);
      this.addLabel(
        bar.x + bar.width / 2,
        bar.y + bar.height / 2,
        bar.label,
        14,
        { color: PAPER, stroke: INK },
      );
    }

    /**
     * Leaves a contact shadow in the hand so a lifted card reads as picked up.
     * @param card - Card slot the shadow belongs to
     */
    private drawCardShadow(card: CardSlot): void {
      this.field.fillStyle(0x000000, 0.14);
      this.field.fillEllipse(
        card.x,
        card.y + card.height * 0.46,
        card.width * 0.72,
        Math.max(10, card.height * 0.08),
      );
    }

    /**
     * Builds one interactive card. Moving the pointer over it lifts the card
     * out of the hand; leaving returns it. The hit area grows downward while
     * hovered so the card does not drop out from under the pointer.
     * @param card - Positioned hand slot
     * @returns Card state the scene eases each frame
     */
    private createHandCard(card: CardSlot): HandCard {
      const motion = cardHoverMotion(card.y, card.height);
      const rules = this.cardRules[card.index];
      const imageKey = cardImageKey(card.index);
      const hasArt = this.textures.exists(imageKey);
      const left = -card.width / 2;
      const top = -card.height / 2;
      const container = this.add.container(card.x, card.y);
      const body = this.add.graphics();
      body.fillStyle(CARD_FILL, 1);
      body.fillRoundedRect(left, top, card.width, card.height, 12);
      body.lineStyle(2, CARD_STROKE, 1);
      body.strokeRoundedRect(left, top, card.width, card.height, 12);
      container.add(body);

      const panels = layoutCardPanels(card, {
        rulesLineCount: captionLineCount(rules, hasArt),
        showArt: hasArt,
      });
      if (panels.art) {
        this.addContainedImage(
          imageKey,
          panels.art.x - card.x,
          panels.art.y - card.y,
          panels.art.width,
          panels.art.height,
          container,
        );
      }
      if (panels.rules) {
        const caption = rules ? formatBattleCardRules(rules) : card.label;
        const fontSize = Math.max(
          12,
          Math.min(16, Math.round(card.width * 0.11)),
        );
        this.addLabel(
          panels.rules.x - card.x,
          panels.rules.y - card.y,
          caption,
          fontSize,
          { wordWrapWidth: panels.rules.width },
          container,
        );
      } else {
        this.addLabel(0, 0, card.label, 16, undefined, container);
      }

      container.setDepth(card.index);
      const hit = new Phaser.Geom.Rectangle(left, top, card.width, card.height);
      container.setInteractive({
        hitArea: hit,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      const handCard: HandCard = {
        container,
        height: card.height,
        hit,
        hoverScale: motion.hover.scale,
        hoverY: motion.hover.y,
        index: card.index,
        lift: motion.lift,
        restY: motion.rest.y,
        targetScale: motion.rest.scale,
        targetY: motion.rest.y,
        width: card.width,
      };
      this.bindCardHover(handCard);
      return handCard;
    }

    /**
     * Points a card at its hovered pose, then back at the hand on leave.
     * @param card - Card to bind
     */
    private bindCardHover(card: HandCard): void {
      const left = -card.width / 2;
      const top = -card.height / 2;

      card.container.on("pointerover", () => {
        card.hit.setTo(left, top, card.width, card.height + card.lift);
        card.container.setDepth(HOVER_DEPTH);
        card.targetScale = card.hoverScale;
        card.targetY = card.hoverY;
      });

      card.container.on("pointerout", () => {
        card.hit.setTo(left, top, card.width, card.height);
        card.targetScale = 1;
        card.targetY = card.restY;
      });
    }

    /**
     * Draws a texture scaled to fit inside a frame.
     * @param key - Texture key
     * @param x - Frame center x
     * @param y - Frame center y
     * @param frameWidth - Maximum display width
     * @param frameHeight - Maximum display height
     * @param parent - Container that owns the image. Defaults to the portrait layer
     */
    private addContainedImage(
      key: string,
      x: number,
      y: number,
      frameWidth: number,
      frameHeight: number,
      parent: Phaser.GameObjects.Container = this.art,
    ): void {
      if (!this.textures.exists(key)) {
        return;
      }
      const image = this.add.image(x, y, key);
      const sourceWidth = image.width;
      const sourceHeight = image.height;
      image.setScale(
        containedScale(sourceWidth, sourceHeight, frameWidth, frameHeight),
      );
      parent.add(image);
    }

    /**
     * Adds a centered label to the text layer.
     * @param x - Horizontal center
     * @param y - Vertical center
     * @param text - Label copy
     * @param fontSize - Font size in pixels
     * @param options.color - CSS color. Defaults to ink
     * @param options.stroke - Outline color. Omitted when unset
     * @param options.wordWrapWidth - Wrap width in pixels. Omitted when unset
     * @param parent - Container that owns the label. Defaults to the actor text layer
     */
    private addLabel(
      x: number,
      y: number,
      text: string,
      fontSize: number,
      options?: { color?: string; stroke?: string; wordWrapWidth?: number },
      parent: Phaser.GameObjects.Container = this.labels,
    ): void {
      const label = this.add.text(x, y, text, {
        align: "center",
        color: options?.color ?? INK,
        fontFamily: "Georgia, serif",
        fontSize: `${fontSize}px`,
        wordWrap: options?.wordWrapWidth
          ? { useAdvancedWrap: true, width: options.wordWrapWidth }
          : undefined,
      });
      if (options?.stroke) {
        label.setStroke(options.stroke, 3);
      }
      label.setOrigin(0.5);
      parent.add(label);
    }
  };
}
