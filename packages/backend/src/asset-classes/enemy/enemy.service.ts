import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { EnemyServiceApi } from "@towers-of-coreborn/api";
import { ConfigurationService } from "src/configuration/configuration.service";
import { EnemyAgent } from "src/mastra/agents/enemy/enemyAgent";
import { requireGenerationId } from "../shared/requireGenerationId";
import { requireGenerationPrompt } from "../shared/requireGenerationPrompt";
import { ENEMY_STORAGE } from "./enemyStorage";
import { readEnemies, readEnemy } from "./readEnemies";

/** Generates and lists full-body enemy portraits. */
@Injectable()
export class EnemyService {
  public constructor(
    private readonly agent: EnemyAgent,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Stops an in-flight enemy generation.
   * @param payload - Client generation id
   * @returns Whether the stop was recorded
   */
  public async cancel(
    payload: EnemyServiceApi["cancel"]["payload"],
  ): Promise<EnemyServiceApi["cancel"]["response"]> {
    const generationId = requireGenerationId(payload.generationId);
    return { stopped: await this.agent.abort(generationId) };
  }

  /**
   * @param payload - Natural-language creature idea and the id that can stop it
   * @returns Newly stored enemy
   */
  public async generate(
    payload: EnemyServiceApi["generate"]["payload"],
  ): Promise<EnemyServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the enemy to generate.",
    );
    const generationId = requireGenerationId(payload.generationId);
    const { id } = await this.agent.query({ generationId, prompt });
    const asset = await readEnemy(
      ENEMY_STORAGE.rootPath(),
      id,
      this.getPublicBaseUrl(),
    );
    if (asset === undefined) {
      throw new InternalServerErrorException(
        `Enemy ${id} was generated but could not be read back.`,
      );
    }
    return asset;
  }

  /**
   * @returns Stored enemies, newest first
   */
  public async list(): Promise<EnemyServiceApi["list"]["response"]> {
    return {
      enemies: await readEnemies(
        ENEMY_STORAGE.rootPath(),
        this.getPublicBaseUrl(),
      ),
    };
  }

  /** @returns Absolute URL of the enemy static folder */
  private getPublicBaseUrl(): string {
    return ENEMY_STORAGE.publicUrl(
      this.configurationService.get("BACKEND_API_URL"),
    );
  }
}
