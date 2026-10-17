import { describe, expect, test } from "bun:test";
import { AUDIO_OUTPUT_MODELS, supportsAudioOutput } from "../audioModelSupport";

describe("AUDIO_OUTPUT_MODELS", () => {
  test("open-ai contains expected audio models", () => {
    expect(AUDIO_OUTPUT_MODELS["open-ai"].has("gpt-audio")).toBe(true);
    expect(AUDIO_OUTPUT_MODELS["open-ai"].has("gpt-audio-mini")).toBe(true);
    expect(AUDIO_OUTPUT_MODELS["open-ai"].has("gpt-5-mini")).toBe(false);
  });

  test("gemini contains expected TTS models", () => {
    expect(AUDIO_OUTPUT_MODELS.gemini.has("gemini-2.5-flash-preview-tts")).toBe(
      true,
    );
    expect(AUDIO_OUTPUT_MODELS.gemini.has("gemini-2.5-pro-preview-tts")).toBe(
      true,
    );
    expect(AUDIO_OUTPUT_MODELS.gemini.has("gemini-2.5-pro")).toBe(false);
  });

  test("anthropic has no audio models", () => {
    expect(AUDIO_OUTPUT_MODELS.anthropic.size).toBe(0);
  });
});

describe("supportsAudioOutput", () => {
  test("returns true for supported OpenAI audio models", () => {
    expect(supportsAudioOutput("open-ai", "gpt-audio")).toBe(true);
    expect(supportsAudioOutput("open-ai", "gpt-audio-mini")).toBe(true);
  });

  test("returns false for non-audio OpenAI models", () => {
    expect(supportsAudioOutput("open-ai", "gpt-5-mini")).toBe(false);
  });

  test("returns true for supported Gemini TTS models", () => {
    expect(supportsAudioOutput("gemini", "gemini-2.5-flash-preview-tts")).toBe(
      true,
    );
    expect(supportsAudioOutput("gemini", "gemini-2.5-pro-preview-tts")).toBe(
      true,
    );
  });

  test("returns false for non-TTS Gemini models", () => {
    expect(supportsAudioOutput("gemini", "gemini-2.5-pro")).toBe(false);
  });

  test("returns false for all Anthropic models", () => {
    expect(supportsAudioOutput("anthropic", "claude-sonnet-4-20250514")).toBe(
      false,
    );
  });
});
