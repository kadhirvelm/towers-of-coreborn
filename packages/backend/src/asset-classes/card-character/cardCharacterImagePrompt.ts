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
  1: "Weakest stage. The character looks inexperienced, under-equipped, and physically unimposing. No dramatic power effects.",
  2: "Early strength. Better gear and a more confident stance, but still clearly below their peak.",
  3: "Formidable. Mastered equipment, visible power, and a commanding presence.",
  4: "Peak power. Legendary and overwhelming, with the theme fully realized. Still the same individual.",
};

const PORTRAIT_RULES = [
  "Exactly one character, centered, facing the viewer, eyes toward the camera.",
  "Show the body from about the thighs upward, with the face large enough to read.",
  "Plain dark gradient background.",
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
 * Layout rules (single portrait, facing the viewer, four-step progression)
 * are fixed here. Subject and theme come from the coordinator agent.
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
    "Create one collectible-card character portrait.",
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
    "Render in the style described by the theme and identity. When no style is specified, use a polished character-card illustration.",
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

  return "A reference image of this exact character at level 1 is attached. Keep the same face, species, age, and costume identity. Change only the strength, gear, and effects described for this level.";
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
