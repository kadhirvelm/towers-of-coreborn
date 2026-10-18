export const BATTLE_BACKGROUND_PROMPT_OPENING =
  "Create one wide 16:9 soft watercolor painting to use as a dreamy background for a card-battler encounter.";

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
    "- A soft, dreamy hand-painted watercolor on textured paper: loose wet-on-wet washes, pigment blooms, gently bleeding edges, and visible paper grain.",
    "- Suggest forms rather than render them. Simplify architecture and foliage into broad, translucent shapes with few hard lines.",
    "- Low detail overall. Let distant areas dissolve into mist and pale wash, and leave generous areas of soft, empty color.",
    "- Light, airy, low-contrast values with a luminous glow. Even night or shadowed rooms stay soft and pastel, never murky or black.",
    "- Chinese mythology and cultivation atmosphere, like a misty shan shui ink-and-wash landscape; never generic western fantasy.",
    "- Jade, moss, and sage greens as the primary palette, with pale gray stone accents.",
    "- An ancient tower reclaimed by nature, hinted through soft leaf silhouettes, a few drifting vines, and foliage washes framing the edges.",
    "- Avoid photorealism, 3D rendering, digital matte painting, sharp focus, fine textures, crisp stone cracks, and dense intricate detail.",
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
    BATTLE_BACKGROUND_PROMPT_OPENING,
    `Room: ${input.title.trim()}`,
    `Scene direction: ${input.description.trim()}`,
    "",
    battleBackgroundImageRules(),
    ...retry,
  ].join("\n");
}
