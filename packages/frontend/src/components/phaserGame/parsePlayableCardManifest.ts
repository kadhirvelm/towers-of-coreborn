import {
  isPlayableCardChainKind,
  isPlayableCardKind,
  type PlayableCardEffect,
  type PlayableCardRules,
} from "@towers-of-coreborn/api";

/**
 * Reads the gameplay fields from a playable-card manifest.
 * Extra fields, including Lore passages, are ignored.
 * Unknown effect kinds are rejected so the battle only plays the API rules.
 * @param value - Parsed JSON, or anything the loader cached
 * @returns Rules to play and draw, or `undefined` when the name, cost, or an effect is unusable
 */
export function parsePlayableCardManifest(
  value: unknown,
): PlayableCardRules | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = value.name;
  const aetherCost = value.aetherCost;
  if (typeof name !== "string" || name.trim() === "") {
    return undefined;
  }
  if (
    typeof aetherCost !== "number" ||
    !Number.isInteger(aetherCost) ||
    aetherCost < 0
  ) {
    return undefined;
  }
  if (!Array.isArray(value.effects)) {
    return undefined;
  }

  const effects: PlayableCardEffect[] = [];
  for (const entry of value.effects) {
    const effect = parseEffect(entry);
    if (effect === undefined) {
      return undefined;
    }
    effects.push(effect);
  }

  return { aetherCost, effects, name: name.trim() };
}

/**
 * Builds the caption drawn on a card: name, Aether cost, then each effect.
 * @param rules - Parsed manifest or loadout rules
 * @returns Caption text, one rules line per row
 */
export function formatBattleCardRules(rules: PlayableCardRules): string {
  const cost = formatAetherCost(rules.aetherCost);
  const effects = rules.effects.map((effect) => effect.text).join("\n");
  if (effects === "") {
    return `${rules.name} · ${cost}`;
  }
  return `${rules.name} · ${cost}\n${effects}`;
}

/**
 * @param aetherCost - Non-negative Aether cost
 * @returns Cost label, singular when the card costs 1
 */
function formatAetherCost(aetherCost: number): string {
  if (aetherCost === 1) {
    return "1 Aether";
  }
  return `${aetherCost} Aether`;
}

/**
 * @param value - One `effects` entry
 * @returns The effect, using `kind` and `amount` when `text` is missing
 */
function parseEffect(value: unknown): PlayableCardEffect | undefined {
  if (!isRecord(value) || !isPlayableCardKind(value.kind)) {
    return undefined;
  }
  if (
    typeof value.amount !== "number" ||
    !Number.isInteger(value.amount) ||
    value.amount < 0
  ) {
    return undefined;
  }

  const fallback = `${value.kind} ${value.amount}`;
  const text =
    typeof value.text === "string" && value.text.trim() !== ""
      ? value.text.trim()
      : fallback;
  if (value.kind === "combo" && isPlayableCardChainKind(value.chainsFrom)) {
    return {
      amount: value.amount,
      chainsFrom: value.chainsFrom,
      kind: "combo",
      text,
    };
  }
  return { amount: value.amount, kind: value.kind, text };
}

/**
 * @param value - Unknown JSON value
 * @returns Whether the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
