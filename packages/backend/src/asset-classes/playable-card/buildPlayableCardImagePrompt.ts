/**
 * Watercolor rules every playable-card image prompt must include.
 * The coordinator instructions and {@link buildPlayableCardImagePrompt} share this text.
 * @returns The fixed art direction for one card portrait
 */
export function playableCardImageRules(): string {
  return [
    "Collectible card illustration for a tower-climbing card game.",
    "Watercolor on paper: soft edges, pastel washes, dreamy atmosphere.",
    "Palette: jade, moss, and sage green, with gray stone accents.",
    "Leaf and vine motifs. Aether is a leaf or vine-and-dew, never an orb or gem.",
    "The subject comes from Chinese cultivation myth and the scene below.",
    "One clear subject, portrait composition, empty margin around it.",
    "No letters, numbers, card frame, border, logo, or interface.",
  ].join("\n");
}

/**
 * Wraps a card scene in the game's watercolor art direction.
 * The design doc requires soft pastel washes, a leaf motif, and no rendered text.
 * @param params - Card name and the scene the writer asked to paint
 * @returns Prompt for the generate-image tool
 */
export function buildPlayableCardImagePrompt(params: {
  name: string;
  scene: string;
}): string {
  return [
    playableCardImageRules(),
    `Card name, for subject only, do not render it as text: ${params.name}.`,
    `Scene: ${params.scene}`,
  ].join("\n");
}
