import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { PlayableCardServiceApi } from "@towers-of-coreborn/api";
import { ConfigurationService } from "src/configuration/configuration.service";
import { CardGeneratorAgent } from "src/mastra/agents/card-generator/cardGeneratorAgent";
import { requireGenerationPrompt } from "../shared/requireGenerationPrompt";
import { PLAYABLE_CARD_STORAGE } from "./playableCardStorage";
import { readPlayableCard, readPlayableCards } from "./readPlayableCards";

/**
 * Playable-card asset class: generates one lore-backed card and lists the
 * cards already stored.
 */
@Injectable()
export class PlayableCardService {
  public constructor(
    private readonly cardGeneratorAgent: CardGeneratorAgent,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Searches the Lore document, writes a card, and returns the stored asset.
   * @param payload - Natural-language description of the card
   * @param sessionId - Browser session that holds the ProductNow connection
   * @returns The stored card with an absolute image URL
   * @throws BadRequestException when the prompt is empty
   * @throws UnauthorizedException when ProductNow is not connected
   * @throws InternalServerErrorException when generation fails or the card cannot be read back
   */
  public async generate(
    payload: PlayableCardServiceApi["generate"]["payload"],
    sessionId: string,
  ): Promise<PlayableCardServiceApi["generate"]["response"]> {
    const prompt = requireGenerationPrompt(
      payload.prompt,
      "Describe the card to generate.",
    );
    const { cardId } = await this.cardGeneratorAgent.query({
      prompt,
      sessionId,
    });
    const card = await readPlayableCard(
      PLAYABLE_CARD_STORAGE.rootPath(),
      cardId,
      this.getPublicBaseUrl(),
    );
    if (card === undefined) {
      throw new InternalServerErrorException(
        `Playable card ${cardId} was generated but could not be read back.`,
      );
    }
    return card;
  }

  /**
   * Lists stored playable cards, newest first.
   * @returns Every complete card with an absolute image URL
   */
  public async list(): Promise<PlayableCardServiceApi["list"]["response"]> {
    const cards = await readPlayableCards(
      PLAYABLE_CARD_STORAGE.rootPath(),
      this.getPublicBaseUrl(),
    );
    return { cards };
  }

  /**
   * @returns Absolute URL of the playable-card folder, without a trailing slash
   */
  private getPublicBaseUrl(): string {
    return PLAYABLE_CARD_STORAGE.publicUrl(
      this.configurationService.get("BACKEND_API_URL"),
    );
  }
}
