import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Blob,
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  Modality,
  Part,
} from "@google/genai";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigurationService } from "../configuration/configuration.service";
import {
  isPcmAudio,
  parseSampleRateFromMimeType,
  pcmToWav,
} from "../utils/pcmToWav";
import { retryWithBackoff } from "../utils/retryWithBackoff";
import {
  ImageGenerationConfig,
  InputFile,
  ModelChatRequest,
  ModelRequest,
  ModelRequestReturnType,
  PreviousMessage,
} from "./types/modelRequestTypes";
import { StreamEvent } from "./types/streamTypes";

/** Used when an image request does not pass `imageConfig`. */
const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  aspectRatio: "1:1",
  imageSize: "1K",
};

const TEXT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
] as const;

/**
 * Vertex publisher model IDs for image output. Preview IDs get retired once the
 * GA model ships (e.g. `gemini-3-pro-image-preview` now 404s); use the GA name.
 */
const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image",
  "gemini-3.1-flash-image-preview",
] as const;

const TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

export const GEMINI_AVAILABLE_MODELS = [
  ...TEXT_MODELS,
  ...IMAGE_MODELS,
  ...TTS_MODELS,
] as const;

/** Google Search tool - not compatible with structured output/controlled generation */
const GOOGLE_SEARCH_TOOL = [{ googleSearch: {} }] as never;

/** Models that do not support search (grounding). */
const MODELS_WITHOUT_SEARCH_TOOL = new Set([
  "gemini-2.5-flash-image",
  ...TTS_MODELS,
]);

@Injectable()
export class GeminiService {
  private geminiClient: GoogleGenAI | undefined;

  public constructor(private configurationService: ConfigurationService) {
    // Gemini credentials are optional in local development, so we don't want to throw an error if they're not set.
    const maybeGeminiCredentials =
      this.configurationService.get("GEMINI_CREDENTIALS");
    if (
      maybeGeminiCredentials === undefined ||
      !maybeGeminiCredentials.includes("{")
    ) {
      return;
    }

    const geminiCredentials = JSON.parse(maybeGeminiCredentials);
    const projectId = geminiCredentials.project_id;
    if (typeof projectId !== "string" || projectId.length === 0) {
      return;
    }

    this.geminiClient = new GoogleGenAI({
      apiVersion: "v1",
      googleAuthOptions: {
        credentials: geminiCredentials,
      },
      location: "global",
      project: projectId,
      vertexai: true,
    });
  }

  public async requestTextCompletion<Request extends ModelRequest<"gemini">>({
    abortSignal,
    inputFiles,
    prompt,
    instructions,
    model,
    temperature,
    schema,
    maxTokens,
    audioConfig,
    imageConfig,
  }: Request): Promise<ModelRequestReturnType<Request>> {
    if (this.geminiClient == null) {
      throw new InternalServerErrorException(
        "Gemini client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      return this.handleAudioTts({
        audioConfig,
        instructions,
        model,
        prompt,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const geminiClient = this.geminiClient;
    const result = await retryWithBackoff(() =>
      geminiClient.models.generateContent({
        config: this.buildConfig({
          abortSignal,
          imageConfig,
          instructions,
          maxTokens,
          model,
          schema,
          temperature,
        }),
        contents: [
          {
            parts: this.assembleParts(prompt, inputFiles),
            role: "user",
          },
        ],
        model: model ?? "gemini-2.5-pro",
      }),
    );

    const text = await this.convertResponseToText(result);

    return this.handleResponse(text, schema) as ModelRequestReturnType<Request>;
  }

  public async requestTextCompletionStream<
    Request extends ModelRequest<"gemini">,
  >(
    {
      inputFiles,
      prompt,
      instructions,
      model,
      temperature,
      schema,
      maxTokens,
      audioConfig,
      imageConfig,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (this.geminiClient == null) {
      throw new InternalServerErrorException(
        "Gemini client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      return this.handleAudioTts({
        audioConfig,
        instructions,
        model,
        prompt,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const geminiClient = this.geminiClient;
    const streamingResult = await retryWithBackoff(() =>
      geminiClient.models.generateContentStream({
        config: this.buildConfig({
          imageConfig,
          instructions,
          maxTokens,
          model,
          schema,
          temperature,
        }),
        contents: [
          { parts: this.assembleParts(prompt, inputFiles), role: "user" },
        ],
        model: model ?? "gemini-2.5-pro",
      }),
    );
    const textResponse = await this.handleStreamData(streamingResult, onEvent);

    return this.handleResponse(
      textResponse,
      schema,
    ) as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletion<
    Request extends ModelChatRequest<"gemini">,
  >(
    {
      inputFiles,
      inputMessagesOrdered,
      instructions,
      model,
      previousMessages,
      schema,
      temperature,
      maxTokens,
      audioConfig,
    }: Request,
    onCompletion?: (messageNumber: number) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (this.geminiClient == null) {
      throw new InternalServerErrorException(
        "Gemini client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      return this.handleAudioTts({
        audioConfig,
        instructions,
        model,
        prompt: inputMessagesOrdered.join("\n"),
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const { contents, systemMessage } =
      this.translatePreviousMessagesToContents(
        previousMessages ?? [],
        inputFiles,
      );

    const currentContents = [...contents];
    const combinedInstructions = systemMessage + (instructions ?? "");
    const geminiClient = this.geminiClient;

    let finalResponse = "";

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentContents.push({
        parts: [{ text: message }],
        role: "user",
      });

      if (index !== inputMessagesOrdered.length - 1) {
        const result = await retryWithBackoff(() =>
          geminiClient.models.generateContent({
            config: this.buildConfig({
              instructions: combinedInstructions,
              model,
              schema: "string",
              temperature,
            }),
            contents: currentContents,
            model: model ?? "gemini-2.5-pro",
          }),
        );
        const textResponse = await this.convertResponseToText(result);

        onCompletion?.(index);

        // TODO: handle the situation where the intermediate response is an image
        currentContents.push({
          parts: [{ text: textResponse as string }],
          role: "model",
        });
        continue;
      }

      const finalResult = await retryWithBackoff(() =>
        geminiClient.models.generateContent({
          config: this.buildConfig({
            instructions: combinedInstructions,
            maxTokens,
            model,
            schema,
            temperature,
          }),
          contents: currentContents,
          model: model ?? "gemini-2.5-pro",
        }),
      );
      finalResponse = await this.convertResponseToText(finalResult);

      onCompletion?.(index);
    }

    return this.handleResponse(
      finalResponse,
      schema,
    ) as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletionStream<
    Request extends ModelChatRequest<"gemini">,
  >(
    {
      inputFiles,
      inputMessagesOrdered,
      instructions,
      model,
      previousMessages,
      schema,
      temperature,
      onCompletion,
      maxTokens,
      audioConfig,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (this.geminiClient == null) {
      throw new InternalServerErrorException(
        "Gemini client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      return this.handleAudioTts({
        audioConfig,
        instructions,
        model,
        prompt: inputMessagesOrdered.join("\n"),
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const { contents, systemMessage } =
      this.translatePreviousMessagesToContents(
        previousMessages ?? [],
        inputFiles,
      );

    const currentContents = [...contents];
    const combinedInstructions = systemMessage + (instructions ?? "");
    const geminiClient = this.geminiClient;

    let finalResponse = "";

    onEvent({
      type: "loading",
    });

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentContents.push({
        parts: [{ text: message }],
        role: "user",
      });

      if (index !== inputMessagesOrdered.length - 1) {
        const streamingResult = await retryWithBackoff(() =>
          geminiClient.models.generateContentStream({
            config: this.buildConfig({
              instructions: combinedInstructions,
              model,
              schema: "string",
              temperature,
            }),
            contents: currentContents,
            model: model ?? "gemini-2.5-pro",
          }),
        );
        const textResponse = await this.handleStreamData(
          streamingResult,
          onEvent,
        );

        onCompletion?.(index);

        // TODO: handle the situation where the intermediate response is an image
        currentContents.push({
          parts: [{ text: textResponse as string }],
          role: "model",
        });
        continue;
      }

      const streamingResult = await retryWithBackoff(() =>
        geminiClient.models.generateContentStream({
          config: this.buildConfig({
            instructions: combinedInstructions,
            maxTokens,
            model,
            schema,
            temperature,
          }),
          contents: currentContents,
          model: model ?? "gemini-2.5-pro",
        }),
      );
      finalResponse = await this.handleStreamData(streamingResult, onEvent);

      onCompletion?.(index);

      onEvent({
        text: finalResponse as string,
        type: "finish",
      });

      currentContents.push({
        parts: [{ text: finalResponse as string }],
        role: "model",
      });
    }

    return this.handleResponse(
      finalResponse,
      schema,
    ) as ModelRequestReturnType<Request>;
  }

  /**
   * Handles generating audio output using the Gemini TTS models.
   *
   * @param params - The parameters required for TTS:
   *   - audioConfig: Audio configuration, including the desired voice.
   *   - instructions: Optional instructions or context for the model.
   *   - model: The Gemini TTS model name to use.
   *   - prompt: The text prompt to convert to speech.
   * @returns Local filesystem path to the written audio file.
   * @throws InternalServerErrorException if the Gemini client is not initialized.
   */
  private async handleAudioTts(params: {
    audioConfig: ModelRequest<"gemini">["audioConfig"];
    instructions?: string;
    model: ModelRequest<"gemini">["model"];
    prompt: string;
  }): Promise<string> {
    if (this.geminiClient == null) {
      throw new InternalServerErrorException(
        "Gemini client not initialized - please check the server configuration",
      );
    }

    const ttsModel = (TTS_MODELS as readonly string[]).includes(params.model)
      ? params.model
      : "gemini-2.5-flash-preview-tts";
    const voice = params.audioConfig?.voice ?? "Kore";

    const promptWithInstructions =
      params.instructions != null
        ? `${params.instructions}\n\n${params.prompt}`
        : params.prompt;

    const geminiClient = this.geminiClient;
    const result = await retryWithBackoff(() =>
      geminiClient.models.generateContent({
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
          tools: this.getSearchToolIfAllowed(ttsModel, "audio"),
        },
        contents: [
          {
            parts: [{ text: promptWithInstructions }],
            role: "user",
          },
        ],
        model: ttsModel,
      }),
    );

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find(
      (part: Part) => part.inlineData?.mimeType?.startsWith("audio/") ?? false,
    );

    if (audioPart?.inlineData == null) {
      throw new InternalServerErrorException(
        "No audio data returned from Gemini TTS model.",
      );
    }

    const rawBuffer = Buffer.from(audioPart.inlineData.data ?? "", "base64");
    const mimeType = audioPart.inlineData.mimeType ?? "";

    const audioBuffer = isPcmAudio(mimeType)
      ? pcmToWav(rawBuffer, parseSampleRateFromMimeType(mimeType))
      : rawBuffer;

    const extension = isPcmAudio(mimeType)
      ? "wav"
      : (mimeType.split("/")[1] ?? "wav");

    return this.writeInlineMediaToStagingFile(audioBuffer, extension);
  }

  /**
   * Writes model inline media to a temp staging directory and returns the
   * **absolute** path. Relative paths (CWD-dependent) break consumers that
   * expect files to be findable for validation, moves, and cross-package paths.
   */
  private writeInlineMediaToStagingFile(
    buffer: Buffer,
    extension: string,
  ): string {
    const directory = join(tmpdir(), "towers-of-coreborn-gemini-media");
    mkdirSync(directory, { recursive: true });
    const filePath = join(
      directory,
      `${crypto.randomUUID()}.${extension.replace(/^\./, "")}`,
    );
    writeFileSync(filePath, buffer);
    return filePath;
  }

  private buildConfig(params: {
    abortSignal?: AbortSignal;
    imageConfig?: ModelRequest<"gemini">["imageConfig"];
    instructions?: string;
    maxTokens?: number;
    model: ModelRequest<"gemini">["model"];
    schema: ModelChatRequest<"gemini">["schema"];
    temperature?: number;
  }): GenerateContentConfig {
    const config: GenerateContentConfig = {
      abortSignal: params.abortSignal,
      maxOutputTokens: params.maxTokens,
      systemInstruction: params.instructions,
      temperature: params.temperature ?? 0,
      tools: this.getSearchToolIfAllowed(params.model, params.schema),
    };

    if (params.schema === "image") {
      config.responseModalities = [Modality.IMAGE];
      config.imageConfig = {
        ...(params.imageConfig ?? DEFAULT_IMAGE_GENERATION_CONFIG),
      };
      return config;
    }

    if (params.schema === "audio") {
      config.responseModalities = [Modality.AUDIO];
      return config;
    }

    if (params.schema === "string") {
      return config;
    }

    config.responseMimeType = "application/json";
    config.responseSchema =
      params.schema as GenerateContentConfig["responseSchema"];
    return config;
  }

  /**
   * Returns the Google Search tool if the schema allows it.
   * Google Search is not compatible with controlled generation (structured output).
   * @param schema - The response schema
   * @returns The Google Search tool array or undefined
   */
  private getSearchToolIfAllowed(
    model: string,
    schema:
      | ModelRequest<"gemini">["schema"]
      | ModelChatRequest<"gemini">["schema"],
  ) {
    const supportsSearchTool = !MODELS_WITHOUT_SEARCH_TOOL.has(model);

    if (!supportsSearchTool) {
      return undefined;
    }

    if (schema === "string" || schema === "image" || schema === "audio") {
      return GOOGLE_SEARCH_TOOL;
    }

    return undefined;
  }

  private handleResponse(
    text: string,
    schema: ModelRequest<"gemini">["schema"],
  ) {
    if (schema === "image" || schema === "audio") {
      if (text === "") {
        throw new InternalServerErrorException(
          `Expected a media response from the model, but received an empty result.`,
        );
      }

      return text as unknown as ModelRequestReturnType<ModelRequest<"gemini">>;
    }

    if (schema !== "string") {
      return JSON.parse(text) as ModelRequestReturnType<ModelRequest<"gemini">>;
    }

    return text as unknown as ModelRequestReturnType<ModelRequest<"gemini">>;
  }

  private async handleStreamData(
    stream: AsyncGenerator<GenerateContentResponse>,
    onEvent: (event: StreamEvent) => void,
  ) {
    let fullText = "";
    let latestResponse: GenerateContentResponse | undefined;
    let lastResponseWithMedia: GenerateContentResponse | undefined;

    for await (const event of stream) {
      latestResponse = event;

      if (this.responseHasMedia(event)) {
        lastResponseWithMedia = event;
      }

      const delta = event.text ?? "";
      if (delta !== "") {
        fullText += delta;
      }

      onEvent({
        delta,
        type: "delta",
      });
    }

    const finalResponse = lastResponseWithMedia ?? latestResponse;
    if (finalResponse == null) {
      return "";
    }

    return this.convertResponseToText(finalResponse, fullText);
  }

  private async convertResponseToText(
    result: GenerateContentResponse,
    textFallback?: string,
  ): Promise<string> {
    const parts = result.candidates?.[0]?.content?.parts ?? [];

    const hasInlineData = parts.some(this.isInlineDataPart);

    if (hasInlineData) {
      const firstMedia = parts.find(this.isInlineDataPart);

      if (firstMedia?.inlineData?.mimeType?.startsWith("audio/")) {
        const audioBuffer = Buffer.from(
          firstMedia.inlineData.data ?? "",
          "base64",
        );
        const extension = firstMedia.inlineData.mimeType.split("/")[1] ?? "wav";
        return this.writeInlineMediaToStagingFile(audioBuffer, extension);
      }

      const imageBuffer = Buffer.from(
        firstMedia?.inlineData?.data ?? "",
        "base64",
      );
      const extension =
        firstMedia?.inlineData?.mimeType?.split("/")[1] ?? "png";
      return this.writeInlineMediaToStagingFile(imageBuffer, extension);
    }

    const text = parts
      .filter((part: Part) => typeof part.text === "string")
      .map((part: Part) => part.text)
      .join("");

    return text === "" ? (textFallback ?? result.text ?? "") : text;
  }

  private translatePreviousMessagesToContents(
    previousMessages: PreviousMessage[],
    inputFiles?: InputFile[],
  ) {
    // If there are system messages, we'll append them to the instructions
    let systemMessage = "";
    const filteredPreviousMessages: Content[] =
      this.getInputFilesParts(inputFiles);

    for (const message of previousMessages) {
      if (message.role === "system") {
        systemMessage += `${message.content}\n`;
      } else {
        filteredPreviousMessages.push({
          parts: [{ text: message.content }],
          role: message.role === "assistant" ? "model" : message.role,
        });
      }
    }

    return {
      contents: filteredPreviousMessages,
      systemMessage,
    };
  }

  /**
   * Gets the parts for the input files and returns them as a Content array.
   *
   * @param inputFiles - The input files to get the parts for.
   * @returns The parts for the input files as a Content array.
   */
  private getInputFilesParts(inputFiles?: InputFile[]): Content[] {
    const contents: Content[] = [];
    for (const inputFile of inputFiles ?? []) {
      const finalParts: Part[] = [
        {
          inlineData: { data: inputFile.base64, mimeType: inputFile.mimeType },
        },
      ];

      if (inputFile.description !== undefined) {
        finalParts.push({ text: inputFile.description });
      }

      contents.push({
        parts: finalParts,
        role: "user",
      });
    }

    return contents;
  }

  private assembleParts(prompt: string, inputFiles?: InputFile[]) {
    const parts: Part[] = [{ text: prompt }];
    for (const inputFile of inputFiles ?? []) {
      parts.push({
        inlineData: { data: inputFile.base64, mimeType: inputFile.mimeType },
      });

      if (inputFile.description !== undefined) {
        parts.push({
          text: inputFile.description,
        });
      }
    }

    return parts;
  }

  private isInlineDataPart(
    part: Part | undefined,
  ): part is Part & { inlineData: Blob } {
    return part?.inlineData != null;
  }

  private responseHasMedia(response: GenerateContentResponse) {
    return (
      response.candidates?.some((candidate) =>
        candidate.content?.parts?.some(this.isInlineDataPart),
      ) ?? false
    );
  }
}
