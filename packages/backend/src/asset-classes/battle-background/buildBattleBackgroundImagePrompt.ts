export interface BattleBackgroundImagePromptInput {
  description: string;
  previousError?: string;
  title: string;
}

/**
 * Art direction and combat layout that every battle-background prompt includes.
 * The coordinator instructions and {@link buildBattleBackgroundImagePrompt} share this text.
 * @returns The fixed rules for one wide room painting
 */
export function battleBackgroundImageRules(): string {
  return [
    "Art direction:",
    "- Soft watercolor illustration with visible pastel washes, dreamy atmospheric depth, and gently bleeding edges.",
    "- Chinese mythology and cultivation atmosphere; never generic western fantasy.",
    "- Jade, moss, and sage greens as the primary palette, with gray stone accents.",
    "- An ancient tower interior reclaimed by nature: leaf silhouettes, hanging vines, foliage framing, and leaf-littered stone.",
    "",
    "Battle composition:",
    "- Environment only. No people, monsters, creatures, cards, text, logos, frames, or interface elements.",
    "- Keep the left third readable and relatively uncluttered for the player's party.",
    "- Keep the right third readable and relatively uncluttered for enemies.",
    "- Preserve a broad walkable battle plane through the lower-middle area.",
    "- Keep the bottom quarter calm and low-detail because the card hand overlays it.",
    "- Use architecture and light to frame the central confrontation without placing a focal subject there.",
  ].join("\n");
}

/**
 * Builds a wide room prompt with clear spaces for the combatants and card UI.
 * @param input - Art-directed room title, description, and optional retry context
 * @returns Prompt sent to the image model
 */
export function buildBattleBackgroundImagePrompt(
  input: BattleBackgroundImagePromptInput,
): string {
  const retry =
    input.previousError == null
      ? []
      : [
          `Previous attempt failed: ${input.previousError}. Return a valid image.`,
        ];

  return [
    "Create one wide 16:9 background for a card-battler encounter.",
    `Room: ${input.title.trim()}`,
    `Scene direction: ${input.description.trim()}`,
    "",
    battleBackgroundImageRules(),
    ...retry,
  ].join("\n");
}
