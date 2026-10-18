import {
  CARD_CHARACTER_LEVELS,
  type CardCharacterLevelNumber,
} from "./cardCharacterSpec";

export interface CardCharacterLevelBrief {
  description: string;
  level: CardCharacterLevelNumber;
  title: string;
}

const POWER_STAGE_COPY: Record<CardCharacterLevelNumber, string> = {
  1: "Weakest stage. Small, slight, and plainly dressed, with bare hands or one simple tool. The figure is about one third of the image height. No armor, no weapon upgrades, no power effects.",
  2: "Early strength. Taller and sturdier, about two fifths of the image height. One or two clear gear upgrades, such as a weapon, bracers, or light armor. Faint power effects at most.",
  3: "Formidable. Larger and broader, about half of the image height. Layered armor, a signature weapon, and visible power effects close to the body.",
  4: "Peak power. The largest stage, about three fifths of the image height, with wide white space still around it. Fully equipped with ornate armor, a legendary weapon, and strong power effects. Still the same individual.",
};

const PORTRAIT_RULES = [
  "Exactly one character in a three-quarter view facing right, toward the right edge of the image, where the enemy stands. The face is still readable. Never facing left, never a back view.",
  "Full body from head to feet. Both feet and the top of the head are visible. Do not crop any part of the body.",
  "The character is small in the image: centered horizontally, feet on a shared baseline in the lower part of the frame, with generous empty space on every side.",
  "Same canvas, camera distance, and baseline at every level, so only the character's size and gear show the change in power.",
  "Soft watercolor on paper: pastel washes, gently bleeding edges, and loose brush texture on the character.",
  "Pure white background. No scenery, no floor, no colored wash, no vignette. At most a faint gray shadow under the feet.",
  "No text, no card frame, no logo, no extra characters, no sprite sheet, no turnaround sheet.",
] as const;

export interface CardCharacterImagePromptInput {
  hasReferenceImage: boolean;
  identity: string;
  level: CardCharacterLevelBrief;
  previousError?: string;
  theme: string;
}

/**
 * Composition rules for every card-character portrait.
 * The image-prompt builder and the coordinator instructions both use this text.
 * @returns Bullet lines that must appear in each portrait prompt
 */
export function cardCharacterPortraitRules(): string {
  return PORTRAIT_RULES.map((rule) => `- ${rule}`).join("\n");
}

/**
 * Power-stage guidance for levels 1 through 4.
 * @returns One bullet per stage, weakest first
 */
export function cardCharacterPowerStageGuidance(): string {
  return CARD_CHARACTER_LEVELS.map(
    (level) => `- Level ${level}: ${POWER_STAGE_COPY[level]}`,
  ).join("\n");
}

/**
 * Builds the image-model prompt for one card-character power stage.
 * Layout rules (small full-body watercolor figure facing right on white,
 * four-step growth in size and gear) are fixed here. Subject and theme come
 * from the coordinator agent.
 * @param input - Locked identity, theme, and the stage to paint
 * @returns Prompt text for one image request
 */
export function buildCardCharacterImagePrompt(
  input: CardCharacterImagePromptInput,
): string {
  const stageCount = CARD_CHARACTER_LEVELS.length;
  const referenceLine = describeReference(input.hasReferenceImage);
  const retryLine = describePreviousError(input.previousError);

  return [
    "Create one full-body watercolor collectible-card character.",
    "",
    "Composition:",
    cardCharacterPortraitRules(),
    "",
    "Identity lock (do not change the person):",
    input.identity.trim(),
    "",
    "Theme (keep this visual language):",
    input.theme.trim(),
    "",
    `This portrait is level ${input.level.level} of ${stageCount}: "${input.level.title.trim()}".`,
    POWER_STAGE_COPY[input.level.level],
    `Level-specific direction: ${input.level.description.trim()}`,
    "",
    "Render as soft watercolor on paper. Use the theme for palette, materials, and motifs, not to replace the watercolor style.",
    referenceLine,
    retryLine,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * @param hasReferenceImage - Whether level 1 is attached to this request
 * @returns Instruction that keeps later levels the same person
 */
function describeReference(hasReferenceImage: boolean): string {
  if (!hasReferenceImage) {
    return "Establish the face, species, age, and costume clearly. Later levels are generated from this portrait.";
  }

  return "A reference image of this exact character at level 1 is attached. Keep the same face, species, age, and costume identity. Change only the size, build, gear, and effects described for this level.";
}

/**
 * @param previousError - Failure from an earlier attempt, when retrying
 * @returns A retry note, or an empty string on the first attempt
 */
function describePreviousError(previousError: string | undefined): string {
  if (previousError === undefined || previousError.trim() === "") {
    return "";
  }

  return `The previous attempt failed (${previousError.trim()}). Generate one valid portrait.`;
}
