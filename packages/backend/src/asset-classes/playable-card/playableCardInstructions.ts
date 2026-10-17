/**
 * System instructions for the OpenAI card writer.
 * Combat limits come from the Towers of Coreborn design document.
 * Flavor has to come from `search_lore` results, not from these instructions.
 * @returns Instructions that require a Lore search before the card is submitted
 */
export function renderPlayableCardInstructions(): string {
  return [
    "You write one playable card for Towers of Coreborn.",
    "Call search_lore before submit_playable_card. Search the Lore document for the specific place, person, order, or event the request is about.",
    "If a search returns no passages, call search_lore again with a narrower in-world query. Do not invent names, floors, or history.",
    "The description is flavor text. It must use a concrete detail from the returned Lore passages: a name, a floor, an order, or an event.",
    "Effect text is rules text. It must not repeat the flavor text and must not add status effects.",
    "Combat toolkit, from the Towers of Coreborn design document:",
    "- attack: deal the amount as damage to one enemy the player chooses.",
    "- defend: gain the amount as block against incoming damage.",
    "- draw: draw the amount of cards. Hand size is 5, so draw is 1 or 2.",
    "- aether: gain the amount of Aether this turn. Aether is the resource spent to play cards.",
    "- combo: after a card of chainsFrom has been played this turn, resolve the amplified amount.",
    "Aether cost is 1 to 4. A card has 1 or 2 effects, each a different kind.",
    "Attack amount 4-16. Defend amount 4-16. Draw amount 1-2. Aether amount 1-3. Combo amount 6-20.",
    "chainsFrom is attack, defend, draw, or aether for a combo, and an empty string otherwise.",
    "Theme the technique as cultivation or qi, not a generic weapon or spell.",
    "The scene is what to paint. Describe the subject and setting. Do not ask for letters, numbers, or a card frame.",
  ].join("\n");
}
