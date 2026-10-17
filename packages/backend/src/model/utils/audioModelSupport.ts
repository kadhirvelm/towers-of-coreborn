import { AvailableProviders } from "../types/modelRequestTypes";

/**
 * The models that support audio output for each provider.
 *
 * @example
 * ```ts
 * const models = AUDIO_OUTPUT_MODELS["open-ai"];
 * console.log(models);
 * // Set { "gpt-audio", "gpt-audio-mini" }
 * ```
 */
export const AUDIO_OUTPUT_MODELS: Record<AvailableProviders, Set<string>> = {
  anthropic: new Set(),
  gemini: new Set([
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
  ]),
  "open-ai": new Set(["gpt-audio", "gpt-audio-mini"]),
};

/**
 * Checks if a model supports audio output for a given provider.
 *
 * @param provider - The provider to check the audio output support for.
 * @param model - The model to check the audio output support for.
 * @returns True if the model supports audio output, false otherwise.
 */
export function supportsAudioOutput(
  provider: AvailableProviders,
  model: string,
): boolean {
  return AUDIO_OUTPUT_MODELS[provider].has(model);
}
