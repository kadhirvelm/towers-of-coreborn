import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ChatCompletionTool } from "openai/resources/index";
import { ResponsesModel } from "openai/resources/shared";
import { GEMINI_AVAILABLE_MODELS } from "../gemini.service";
import { StreamEvent } from "./streamTypes";

export type AvailableProviders = "open-ai" | "gemini" | "anthropic";

/** JSON Schema accepted by providers that support structured output. */
type ResponseSchema = Record<string, unknown>;

export type AvailableModel<Provider extends AvailableProviders> =
  Provider extends "open-ai"
    ? ResponsesModel
    : Provider extends "anthropic"
      ? Anthropic.Messages.Model
      : (typeof GEMINI_AVAILABLE_MODELS)[number];

export interface InputFile {
  /** The base64 encoded file data. */
  base64: string;
  /** The mime type of the file. */
  mimeType: string;
  /** The description of the file, used to help the model understand what the file is for. */
  description?: string;
}

/** Gemini raster output shape for `schema: "image"` requests. */
export interface ImageGenerationConfig {
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize: "1K" | "2K";
}
/** Note: not all options are supported by all providers. Please check the code to ensure the options are supported. */
export interface ModelRequest<Provider extends AvailableProviders> {
  /**
   * Stops the provider request when the caller aborts a generation.
   */
  abortSignal?: AbortSignal;
  /**
   * The main prompt or input text to be sent to the model for completion.
   */
  prompt: string;
  /**
   * Optional input image in base64 format to be sent to the model for generation.
   */
  inputFiles?: InputFile[];
  /**
   * Optional system-level instructions or additional context to steer the model's behavior.
   */
  instructions?: string;
  /**
   * The specific model to use for this request (e.g., "gpt-5-mini").
   */
  model: AvailableModel<Provider>;
  /**
   * Sampling temperature to control output randomness. Higher values make responses more diverse.
   */
  temperature?: number;
  /**
   * The maximum number of tokens to generate.
   */
  maxTokens?: number;
  /**
   * The schema to use for the response.
   * If not provided, the model will return a string.
   * For Anthropic, use a JSON Schema object with type, properties, required, and additionalProperties.
   * For Gemini, provide a JSON Schema object.
   */
  schema:
    | (Provider extends "open-ai"
        ? OpenAI.Responses.ResponseTextConfig
        : Provider extends "anthropic"
          ? Record<string, unknown>
          : ResponseSchema)
    | "string"
    | "image"
    | "audio";
  /**
   * Optional Gemini raster settings. When omitted, image requests are 1:1 at 1K.
   */
  imageConfig?: ImageGenerationConfig;
  /**
   * The configuration for the audio output, if applicable.
   */
  audioConfig?: {
    /**
     * The voice to use for the audio output.
     *
     * TODO: make this strongly typed...
     */
    voice?: string;
    /**
     * The format to use for the audio output.
     */
    format?: "wav" | "mp3" | "opus" | "flac" | "pcm16";
  };
  /**
   * The tools the model has available to use for the request.
   */
  tools?: Provider extends "open-ai" ? OpenAI.Responses.Tool[] : [];
  /**
   * The function to call when a stream event is received.
   */
  onEvent?: (event: StreamEvent) => void;
  /**
   * The type of the request.
   */
  type: Provider;
}

export interface PreviousMessage {
  /**
   * The textual content of a previous message in the chat history.
   */
  content: string;
  /**
   * The role of the speaker for this message, either "system", "user" or "assistant".
   */
  role: "system" | "user" | "assistant";
}

export interface ModelChatRequest<Provider extends AvailableProviders> {
  /**
   * Optional input image in base64 format to be sent to the model for generation.
   */
  inputFiles?: InputFile[];
  /**
   * Optional list of previous chat messages exchanged between user and assistant, for context.
   */
  previousMessages?: PreviousMessage[];
  /**
   * Ordered array of user input messages for the current chat turn, maintaining their sequence.
   */
  inputMessagesOrdered: string[];
  /**
   * Optional system instructions or extra guidance to influence the model's behavior in the response.
   */
  instructions?: string;
  /**
   * The schema to use for the response.
   * If not provided, the model will return a string.
   */
  schema:
    | (Provider extends "open-ai" ? "json_object" : ResponseSchema)
    | "string"
    | "image"
    | "audio";
  /**
   * The configuration for the audio output, if applicable.
   */
  audioConfig?: {
    /**
     * The voice to use for the audio output.
     *
     * TODO: make this strongly typed...
     */
    voice?: string;
    /**
     * The format to use for the audio output.
     */
    format?: "wav" | "mp3" | "opus" | "flac" | "pcm16";
  };
  /**
   * The maximum number of tokens to generate.
   */
  maxTokens?: number;
  /**
   * The specific model to use for this request (e.g., "gpt-5-mini").
   */
  model: AvailableModel<Provider>;
  /**
   * Sampling temperature to control output randomness. Higher values make responses more diverse.
   */
  temperature?: number;
  /**
   * The effort to put into the reasoning process.
   */
  reasoningEffort?: Provider extends "open-ai"
    ? "low" | "medium" | "high"
    : undefined;
  /**
   * The tools the model has available to use for the request.
   */
  tools?: Provider extends "open-ai" ? ChatCompletionTool[] : [];
  /**
   * The function to call when each turn of the chat is completed.
   */
  onCompletion?: (messageNumber: number) => void;
  /**
   * The function to call when a stream event is received.
   */
  onEvent?: (event: StreamEvent) => void;
  /**
   * The type of the request.
   */
  type: Provider;
}

/**
 * Convenience type for the return type of a model request.
 */
export type ModelRequestReturnType<
  Request extends
    | ModelRequest<AvailableProviders>
    | ModelChatRequest<AvailableProviders>,
> = Request["schema"] extends "string"
  ? string
  : Request["schema"] extends "image"
    ? string
    : Request["schema"] extends "audio"
      ? string
      : object;
