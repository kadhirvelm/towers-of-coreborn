import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type {
  BattleBackgroundAsset,
  CardCharacterSetAsset,
  DungeonServiceApi,
  PlayableCardAsset,
} from "@towers-of-coreborn/api";
import { BATTLE_BACKGROUND_STORAGE } from "src/asset-classes/battle-background/battleBackgroundStorage";
import { readBattleBackground } from "src/asset-classes/battle-background/readBattleBackgrounds";
import { CARD_CHARACTER_STORAGE } from "src/asset-classes/card-character/cardCharacterStorage";
import { readCardCharacterSet } from "src/asset-classes/card-character/readCardCharacterSets";
import { PLAYABLE_CARD_STORAGE } from "src/asset-classes/playable-card/playableCardStorage";
import { readPlayableCard } from "src/asset-classes/playable-card/readPlayableCards";
import { requireGenerationId } from "src/asset-classes/shared/requireGenerationId";
import { requireGenerationPrompt } from "src/asset-classes/shared/requireGenerationPrompt";
import { ConfigurationService } from "src/configuration/configuration.service";
import { DungeonCoordinatorAgent } from "src/mastra/agents/dungeon-coordinator/dungeonCoordinatorAgent";

/** Runs the dungeon coordinator and resolves its generated ids to public assets. */
@Injectable()
export class DungeonService {
  public constructor(
    private readonly coordinator: DungeonCoordinatorAgent,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Stops one in-flight dungeon generation.
   * @param payload - Parent generation id
   * @returns Whether the stop was recorded
   */
  public async cancel(
    payload: DungeonServiceApi["cancel"]["payload"],
  ): Promise<DungeonServiceApi["cancel"]["response"]> {
    const generationId = requireGenerationId(payload.generationId);
    return { stopped: await this.coordinator.abort(generationId) };
  }

  /**
   * Generates a connected set of rooms, characters, and character cards.
   * @param payload - Broad dungeon prompt and parent generation id
   * @param sessionId - Connected ProductNow browser session
   * @returns Complete generated assets grouped by character
   */
  public async generate(
    payload: DungeonServiceApi["generate"]["payload"],
    sessionId: string,
  ): Promise<DungeonServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the dungeon to generate.",
    );
    const generationId = requireGenerationId(payload.generationId);
    const generated = await this.coordinator.query({
      generationId,
      prompt,
      sessionId,
    });
    const backgrounds = await Promise.all(
      generated.backgroundIds.map((id) => this.readBackground(id)),
    );
    const characters = await Promise.all(
      generated.characters.map(async ({ cardIds, setId }) => ({
        cards: await Promise.all(cardIds.map((id) => this.readCard(id))),
        character: await this.readCharacter(setId),
      })),
    );
    return { backgrounds, characters, summary: generated.summary };
  }

  /**
   * @param id - Stored background id
   * @returns Complete background asset
   */
  private async readBackground(id: string): Promise<BattleBackgroundAsset> {
    const asset = await readBattleBackground(
      BATTLE_BACKGROUND_STORAGE.rootPath(),
      id,
      BATTLE_BACKGROUND_STORAGE.publicUrl(this.backendUrl()),
    );
    return requireGeneratedAsset(asset, "battle background", id);
  }

  /**
   * @param setId - Stored character set id
   * @returns Complete character asset
   */
  private async readCharacter(setId: string): Promise<CardCharacterSetAsset> {
    const asset = await readCardCharacterSet(
      CARD_CHARACTER_STORAGE.rootPath(),
      setId,
      CARD_CHARACTER_STORAGE.publicUrl(this.backendUrl()),
    );
    return requireGeneratedAsset(asset, "card character", setId);
  }

  /**
   * @param cardId - Stored playable card id
   * @returns Complete card asset
   */
  private async readCard(cardId: string): Promise<PlayableCardAsset> {
    const asset = await readPlayableCard(
      PLAYABLE_CARD_STORAGE.rootPath(),
      cardId,
      PLAYABLE_CARD_STORAGE.publicUrl(this.backendUrl()),
    );
    return requireGeneratedAsset(asset, "playable card", cardId);
  }

  /** @returns Configured public backend URL */
  private backendUrl(): string {
    return this.configurationService.get("BACKEND_API_URL");
  }
}

/**
 * @param asset - Asset read from storage
 * @param label - Human-readable asset kind
 * @param id - Expected stored id
 * @returns The complete asset
 */
function requireGeneratedAsset<Asset>(
  asset: Asset | undefined,
  label: string,
  id: string,
): Asset {
  if (asset === undefined) {
    throw new InternalServerErrorException(
      `Dungeon ${label} ${id} was generated but could not be read back.`,
    );
  }
  return asset;
}
