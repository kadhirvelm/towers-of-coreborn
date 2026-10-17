import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { CardCharacterServiceApi } from "@towers-of-coreborn/api";
import { ConfigurationService } from "src/configuration/configuration.service";
import { CardCharacterAgent } from "src/mastra/agents/card-character/cardCharacterAgent";
import { requireGenerationId } from "../shared/requireGenerationId";
import { requireGenerationPrompt } from "../shared/requireGenerationPrompt";
import { CARD_CHARACTER_STORAGE } from "./cardCharacterStorage";
import {
  readCardCharacterSet,
  readCardCharacterSets,
} from "./readCardCharacterSets";

/**
 * Card-character asset class: generates four-level portrait sets and lists
 * the ones already stored.
 */
@Injectable()
export class CardCharacterService {
  public constructor(
    private readonly cardCharacterAgent: CardCharacterAgent,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Stops an in-flight character generation.
   * @param payload - Client generation id
   * @returns Whether the stop was recorded
   */
  public async cancel(
    payload: CardCharacterServiceApi["cancel"]["payload"],
  ): Promise<CardCharacterServiceApi["cancel"]["response"]> {
    const generationId = requireGenerationId(payload.generationId);
    return { stopped: await this.cardCharacterAgent.abort(generationId) };
  }

  /**
   * Runs the card-character agent and returns the saved set.
   * @param payload - Natural-language description of the character and the id that can stop it
   * @returns The stored set with absolute portrait URLs
   * @throws BadRequestException when the prompt is empty or the generation id is not a UUID
   * @throws InternalServerErrorException when generation fails or the set cannot be read back
   */
  public async generate(
    payload: CardCharacterServiceApi["generate"]["payload"],
  ): Promise<CardCharacterServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the character to generate.",
    );
    const generationId = requireGenerationId(payload.generationId);
    const { setId } = await this.cardCharacterAgent.query({
      generationId,
      prompt,
    });
    const set = await readCardCharacterSet(
      CARD_CHARACTER_STORAGE.rootPath(),
      setId,
      this.getPublicBaseUrl(),
    );
    if (set === undefined) {
      throw new InternalServerErrorException(
        `Card character set ${setId} was generated but could not be read back.`,
      );
    }
    return set;
  }

  /**
   * Lists stored card-character sets, newest first.
   * @returns Every complete set with absolute portrait URLs
   */
  public async list(): Promise<CardCharacterServiceApi["list"]["response"]> {
    const sets = await readCardCharacterSets(
      CARD_CHARACTER_STORAGE.rootPath(),
      this.getPublicBaseUrl(),
    );
    return { sets };
  }

  /**
   * @returns Absolute URL of the card-character folder, without a trailing slash
   */
  private getPublicBaseUrl(): string {
    return CARD_CHARACTER_STORAGE.publicUrl(
      this.configurationService.get("BACKEND_API_URL"),
    );
  }
}
