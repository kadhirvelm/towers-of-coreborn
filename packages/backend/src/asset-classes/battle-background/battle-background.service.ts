import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { BattleBackgroundServiceApi } from "@towers-of-coreborn/api";
import { ConfigurationService } from "src/configuration/configuration.service";
import { BattleBackgroundAgent } from "src/mastra/agents/battle-background/battleBackgroundAgent";
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
   * @param payload - Natural-language room idea
   * @returns Newly stored background
   */
  public async generate(
    payload: BattleBackgroundServiceApi["generate"]["payload"],
  ): Promise<BattleBackgroundServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the battle room to generate.",
    );
    const { id } = await this.agent.query({ prompt });
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
