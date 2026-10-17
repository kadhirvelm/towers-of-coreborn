import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { BattleBackgroundServiceApi } from "@towers-of-coreborn/api";
import { ConfigurationService } from "src/configuration/configuration.service";
import { BattleBackgroundAgent } from "src/mastra/agents/battle-background/battleBackgroundAgent";
import { requireGenerationId } from "../shared/requireGenerationId";
import { requireGenerationPrompt } from "../shared/requireGenerationPrompt";
import { BATTLE_BACKGROUND_STORAGE } from "./battleBackgroundStorage";
import {
  readBattleBackground,
  readBattleBackgrounds,
} from "./readBattleBackgrounds";

/** Generates and lists wide battle-room backgrounds. */
@Injectable()
export class BattleBackgroundService {
  public constructor(
    private readonly agent: BattleBackgroundAgent,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Stops an in-flight background generation.
   * @param payload - Client generation id
   * @returns Whether the stop was recorded
   */
  public async cancel(
    payload: BattleBackgroundServiceApi["cancel"]["payload"],
  ): Promise<BattleBackgroundServiceApi["cancel"]["response"]> {
    const generationId = requireGenerationId(payload.generationId);
    return { stopped: await this.agent.abort(generationId) };
  }

  /**
   * @param payload - Natural-language room idea and the id that can stop it
   * @returns Newly stored background
   */
  public async generate(
    payload: BattleBackgroundServiceApi["generate"]["payload"],
  ): Promise<BattleBackgroundServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the battle room to generate.",
    );
    const generationId = requireGenerationId(payload.generationId);
    const { id } = await this.agent.query({ generationId, prompt });
    const asset = await readBattleBackground(
      BATTLE_BACKGROUND_STORAGE.rootPath(),
      id,
      this.getPublicBaseUrl(),
    );
    if (asset === undefined) {
      throw new InternalServerErrorException(
        `Battle background ${id} was generated but could not be read back.`,
      );
    }
    return asset;
  }

  /**
   * @returns Stored backgrounds, newest first
   */
  public async list(): Promise<BattleBackgroundServiceApi["list"]["response"]> {
    return {
      backgrounds: await readBattleBackgrounds(
        BATTLE_BACKGROUND_STORAGE.rootPath(),
        this.getPublicBaseUrl(),
      ),
    };
  }

  /** @returns Absolute URL of the battle-background static folder */
  private getPublicBaseUrl(): string {
    return BATTLE_BACKGROUND_STORAGE.publicUrl(
      this.configurationService.get("BACKEND_API_URL"),
    );
  }
}
