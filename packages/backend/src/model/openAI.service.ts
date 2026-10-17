import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import OpenAI, { toFile } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { ConfigurationService } from "src/configuration/configuration.service";
import { resolveOpenAIImageSize } from "./openAIImageSize";
import {
  InputFile,
  ModelChatRequest,
  ModelRequest,
  ModelRequestReturnType,
} from "./types/modelRequestTypes";
import { StreamEvent } from "./types/streamTypes";

/** Web search tool configuration for OpenAI Responses API */
const WEB_SEARCH_TOOL: OpenAI.Responses.Tool = {
  type: "web_search_preview",
};

/** Models that do not support the web_search_preview tool */
const MODELS_WITHOUT_WEB_SEARCH = new Set(["gpt-4.1-nano"]);

const AUDIO_OUTPUT_MODELS = new Set(["gpt-audio", "gpt-audio-mini"]);

/** Rendering quality for GPT Image requests. */
const OPENAI_IMAGE_QUALITY = "high";

@Injectable()
export class OpenAIService {
  private openAIClient: OpenAI | undefined;

  public constructor(private configurationService: ConfigurationService) {
    const apiKey = this.configurationService.get("OPENAI_API_KEY");
    if (apiKey == null || apiKey.length === 0) {
      return;
    }

    this.openAIClient = new OpenAI({
      apiKey,
    });
  }

  /**
   * Returns the OpenAI client, or fails when no API key was configured.
   * @returns Initialized OpenAI client
   */
  private requireClient(): OpenAI {
    if (this.openAIClient == null) {
      throw new InternalServerErrorException(
        "OpenAI client not initialized - please check the server configuration",
      );
    }

    return this.openAIClient;
  }

  /**
   * One Responses API turn that uses only the tools the caller supplies.
   * Text completion adds web search; this does not, so a caller can require
   * its own knowledge tool.
   * @param params - Model, prompt, and the tools for this turn
   * @returns The model response, including any function calls
   */
  public createResponse(params: {
    abortSignal?: AbortSignal;
    input: OpenAI.Responses.ResponseCreateParams["input"];
    instructions?: string;
    model: OpenAI.Responses.ResponseCreateParams["model"];
    previousResponseId?: string;
    toolChoice?: OpenAI.Responses.ResponseCreateParams["tool_choice"];
    tools?: OpenAI.Responses.Tool[];
  }): Promise<OpenAI.Responses.Response> {
    return this.requireClient().responses.create(
      {
        input: params.input,
        instructions: params.instructions,
        model: params.model,
        stream: false,
        ...(params.previousResponseId === undefined
          ? {}
          : { previous_response_id: params.previousResponseId }),
        ...(params.toolChoice === undefined
          ? {}
          : { tool_choice: params.toolChoice }),
        ...(params.tools === undefined ? {} : { tools: params.tools }),
      },
      { signal: params.abortSignal },
    );
  }

  /**
   * Generates one PNG through the Image API and stages it on disk.
   * A reference image uses the edits endpoint so later card levels keep the same person.
   * @param params - Prompt, optional reference images, and shared size settings
   * @returns Absolute path of the staged PNG
   */
  private async requestImage(params: {
    abortSignal?: AbortSignal;
    imageConfig?: ModelRequest<"open-ai">["imageConfig"];
    inputFiles?: InputFile[];
    instructions?: string;
    model: ModelRequest<"open-ai">["model"];
    prompt: string;
  }): Promise<string> {
    const prompt = joinImagePrompt(params.instructions, params.prompt);
    const size = resolveOpenAIImageSize(params.imageConfig);
    const referenceImages = imageInputs(params.inputFiles);
    const client = this.requireClient();
    const requestOptions = { signal: params.abortSignal };
    const response =
      referenceImages.length === 0
        ? await client.images.generate(
            {
              background: "opaque",
              model: params.model,
              output_format: "png",
              prompt,
              quality: OPENAI_IMAGE_QUALITY,
              size,
            },
            requestOptions,
          )
        : await client.images.edit(
            {
              background: "opaque",
              image: await Promise.all(referenceImages),
              model: params.model,
              output_format: "png",
              prompt,
              quality: OPENAI_IMAGE_QUALITY,
              size,
            },
            requestOptions,
          );

    const encoded = response.data?.[0]?.b64_json;
    if (encoded == null || encoded.length === 0) {
      throw new InternalServerErrorException(
        "OpenAI image model returned no image data.",
      );
    }

    return writeOpenAIImageFile(Buffer.from(encoded, "base64"));
  }

  public async requestTextCompletion<Request extends ModelRequest<"open-ai">>({
    abortSignal,
    prompt,
    inputFiles,
    instructions,
    model,
    temperature,
    tools,
    schema,
    maxTokens,
    audioConfig,
    imageConfig,
  }: Request): Promise<ModelRequestReturnType<Request>> {
    if (schema === "audio") {
      return this.handleAudioViaChatCompletions({
        audioConfig,
        inputFiles,
        instructions,
        maxTokens,
        model,
        prompt,
        temperature,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    if (schema === "image") {
      return this.requestImage({
        abortSignal,
        imageConfig,
        inputFiles,
        instructions,
        model,
        prompt,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const resolvedModel = model ?? "gpt-5-mini";
    const response = await this.requireClient().responses.create(
      {
        input: this.assembleInput(prompt, inputFiles),
        instructions: instructions,
        max_output_tokens: maxTokens,
        model: resolvedModel,
        tools: this.getToolsWithWebSearch(resolvedModel, tools),
        ...(typeof temperature !== "undefined" ? { temperature } : {}),
        ...this.getResponseFormatText(schema),
      },
      { signal: abortSignal },
    );

    if (schema !== "string") {
      return JSON.parse(response.output_text);
    }

    return response.output_text as ModelRequestReturnType<Request>;
  }

  public async requestTextCompletionStream<
    Request extends ModelRequest<"open-ai">,
  >(
    {
      abortSignal,
      prompt,
      inputFiles,
      instructions,
      model,
      temperature,
      tools,
      schema,
      maxTokens,
      audioConfig,
      imageConfig,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (schema === "audio") {
      return this.handleAudioViaChatCompletions({
        audioConfig,
        inputFiles,
        instructions,
        maxTokens,
        model,
        prompt,
        temperature,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    if (schema === "image") {
      onEvent({ type: "loading" });
      const filePath = await this.requestImage({
        abortSignal,
        imageConfig,
        inputFiles,
        instructions,
        model,
        prompt,
      });
      onEvent({ text: filePath, type: "finish" });
      return filePath as ModelRequestReturnType<Request>;
    }

    const resolvedModel = model ?? "gpt-5-mini";
    const response = await this.requireClient().responses.create(
      {
        input: this.assembleInput(prompt, inputFiles),
        instructions: instructions,
        max_output_tokens: maxTokens,
        model: resolvedModel,
        tools: this.getToolsWithWebSearch(resolvedModel, tools),
        ...(typeof temperature !== "undefined" ? { temperature } : {}),
        stream: true,
        ...this.getResponseFormatText(schema),
      },
      { signal: abortSignal },
    );

    let finalText = "";

    for await (const event of response) {
      if (
        event.type === "response.created" ||
        event.type === "response.in_progress" ||
        event.type === "response.output_item.added" ||
        event.type === "response.output_item.done"
      ) {
        onEvent({
          type: "loading",
        });
        continue;
      }

      if (event.type === "response.output_text.delta") {
        onEvent({
          delta: event.delta,
          type: "delta",
        });
        continue;
      }

      if (event.type === "response.output_text.done") {
        finalText = event.text;

        onEvent({
          text: event.text,
          type: "finish",
        });
      }
    }

    if (schema !== "string") {
      return JSON.parse(finalText);
    }

    return finalText as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletion<
    Request extends ModelChatRequest<"open-ai">,
  >({
    inputFiles,
    inputMessagesOrdered,
    instructions,
    model,
    previousMessages,
    schema,
    temperature,
    onCompletion,
    reasoningEffort,
    tools,
    maxTokens,
    audioConfig,
  }: Request): Promise<ModelRequestReturnType<Request>> {
    if (schema === "audio") {
      return this.handleAudioViaChatCompletions({
        audioConfig,
        inputFiles,
        instructions,
        maxTokens,
        model,
        prompt: inputMessagesOrdered.join("\n"),
        temperature,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const currentMessages: ChatCompletionMessageParam[] =
      this.assembleCurrentMessages(
        instructions ?? "",
        previousMessages ?? [],
        inputFiles,
      );

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentMessages.push({ content: message, role: "user" });
      const response = await this.requireClient().chat.completions.create({
        messages: currentMessages,
        model: model ?? "gpt-5-mini",
        ...this.getResponseFormatChat(
          schema,
          index !== inputMessagesOrdered.length - 1,
        ),
        max_tokens:
          index === inputMessagesOrdered.length - 1 ? maxTokens : undefined,
        tools,
        ...(typeof temperature !== "undefined" ? { temperature } : {}),
        reasoning_effort: reasoningEffort,
      });

      onCompletion?.(index);

      const latestChoice = response.choices[0];
      if (latestChoice == null) {
        throw new Error(`Latest choice not found for response: ${response}`);
      }

      currentMessages.push({
        content: latestChoice.message.content ?? "",
        role: "assistant",
      });
    }

    const latestMessage = currentMessages[currentMessages.length - 1];
    if (latestMessage == null) {
      throw new Error(
        `Latest message not found for current messages: ${currentMessages}`,
      );
    }

    if (schema === "json_object") {
      return JSON.parse(latestMessage.content as string);
    }

    return latestMessage.content as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletionStream<
    Request extends ModelChatRequest<"open-ai">,
  >(
    {
      model,
      inputFiles,
      instructions,
      previousMessages,
      schema,
      temperature,
      reasoningEffort,
      tools,
      inputMessagesOrdered,
      onCompletion,
      maxTokens,
      audioConfig,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (schema === "audio") {
      return this.handleAudioViaChatCompletions({
        audioConfig,
        inputFiles,
        instructions,
        maxTokens,
        model,
        prompt: inputMessagesOrdered.join("\n"),
        temperature,
      }) as Promise<ModelRequestReturnType<Request>>;
    }

    const currentMessages: ChatCompletionMessageParam[] =
      this.assembleCurrentMessages(
        instructions ?? "",
        previousMessages ?? [],
        inputFiles,
      );

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentMessages.push({ content: message, role: "user" });
      const response = await this.requireClient().chat.completions.create({
        messages: currentMessages,
        model: model ?? "gpt-5-mini",
        ...this.getResponseFormatChat(
          schema,
          index !== inputMessagesOrdered.length - 1,
        ),
        max_tokens:
          index === inputMessagesOrdered.length - 1 ? maxTokens : undefined,
        reasoning_effort: reasoningEffort,
        stream: true,
        temperature,
        tools,
      });

      onCompletion?.(index);

      let finalText = "";

      for await (const event of response) {
        const delta = event.choices[0]?.delta.content;
        if (delta != null) {
          // Stream delta event: contains new streamed content chunk
          onEvent({
            delta,
            type: "delta",
          });
          finalText += delta;
        } else if (
          event.choices?.[0]?.finish_reason !== undefined &&
          event.choices[0].finish_reason !== null
        ) {
          // Stream finish event: OpenAI marks finish with finish_reason
          onEvent({
            text: finalText,
            type: "finish",
          });
        } else {
          // Stream loading/start event (first response is often empty for OpenAI)
          onEvent({
            type: "loading",
          });
        }
      }

      currentMessages.push({
        content: finalText,
        role: "assistant",
      });
    }

    const latestMessage = currentMessages[currentMessages.length - 1];
    if (latestMessage == null) {
      throw new Error(
        `Latest message not found for current messages: ${currentMessages}`,
      );
    }

    if (schema !== "string") {
      return JSON.parse(latestMessage.content as string);
    }

    return latestMessage.content as ModelRequestReturnType<Request>;
  }

  private async handleAudioViaChatCompletions(params: {
    audioConfig: ModelRequest<"open-ai">["audioConfig"];
    inputFiles?: ModelRequest<"open-ai">["inputFiles"];
    instructions?: string;
    maxTokens?: number;
    model: ModelRequest<"open-ai">["model"];
    prompt: string;
    temperature?: number;
  }): Promise<string> {
    const resolvedModel = AUDIO_OUTPUT_MODELS.has(params.model)
      ? params.model
      : "gpt-audio";
    const format = params.audioConfig?.format ?? "wav";
    const voice = params.audioConfig?.voice ?? "alloy";

    const messages: ChatCompletionMessageParam[] = [];
    if (params.instructions) {
      messages.push({ content: params.instructions, role: "system" });
    }
    messages.push({ content: params.prompt, role: "user" });

    const response = await this.requireClient().chat.completions.create({
      audio: { format, voice },
      max_tokens: params.maxTokens,
      messages,
      modalities: ["text", "audio"],
      model: resolvedModel,
      ...(typeof params.temperature !== "undefined"
        ? { temperature: params.temperature }
        : {}),
    });

    const audioData = (
      response.choices[0]?.message as unknown as Record<string, unknown>
    )?.audio as { data?: string } | undefined;
    if (audioData?.data == null) {
      throw new BadRequestException(
        "No audio data returned from OpenAI audio model.",
      );
    }

    const audioBuffer = Buffer.from(audioData.data, "base64");
    const fileName = `${crypto.randomUUID()}.${format}`;
    writeFileSync(fileName, audioBuffer);

    return fileName;
  }

  private getResponseFormatText(schema: ModelRequest<"open-ai">["schema"]) {
    const text = (() => {
      if (schema === "string" || schema === "image" || schema === "audio") {
        return undefined;
      }

      return schema;
    })();

    return {
      text: text,
    };
  }

  private getResponseFormatChat(
    schema: ModelChatRequest<"open-ai">["schema"],
    skip?: boolean,
  ) {
    if (skip) {
      return undefined;
    }

    const responseFormat = (() => {
      if (schema === "string" || schema === "image" || schema === "audio") {
        return undefined;
      }

      return { type: schema };
    })();

    return {
      response_format: responseFormat,
    };
  }

  /**
   * Merges the web search tool with any existing tools passed to the Responses API.
   * Excludes web search for models that don't support it.
   * @param model - The model being used for the request
   * @param tools - Optional array of existing tools
   * @returns Array of tools, including web search if the model supports it
   */
  private getToolsWithWebSearch(
    model: string,
    tools?: OpenAI.Responses.Tool[],
  ): OpenAI.Responses.Tool[] | undefined {
    const supportsWebSearch = !MODELS_WITHOUT_WEB_SEARCH.has(model);

    if (!supportsWebSearch) {
      return tools;
    }

    if (tools === undefined) {
      return [WEB_SEARCH_TOOL];
    }

    return [WEB_SEARCH_TOOL, ...tools];
  }

  private assembleInput(prompt: string, inputFiles?: InputFile[]) {
    if (inputFiles === undefined) {
      return prompt;
    }

    const content: OpenAI.Responses.ResponseInputMessageContentList = [
      { text: prompt, type: "input_text" },
    ];

    for (const inputFile of inputFiles) {
      if (inputFile.description !== undefined) {
        content.push({ text: inputFile.description, type: "input_text" });
      }

      if (inputFile.mimeType.startsWith("image/")) {
        content.push({
          detail: "auto",
          image_url: `data:${inputFile.mimeType};base64,${inputFile.base64}`,
          type: "input_image",
        });
      } else if (inputFile.mimeType === "application/pdf") {
        // Responses API only supports PDF for input_file
        content.push({
          file_data: `data:${inputFile.mimeType};base64,${inputFile.base64}`,
          filename: inputFile.description ?? "",
          type: "input_file",
        });
      } else {
        // For other file types, decode base64 and include as text
        const decodedContent = Buffer.from(inputFile.base64, "base64").toString(
          "utf-8",
        );
        content.push({ text: decodedContent, type: "input_text" });
      }
    }

    return [
      {
        content,
        role: "user" as const,
        type: "message" as const,
      },
    ];
  }

  private assembleCurrentMessages(
    instructions: string,
    previousMessages: ChatCompletionMessageParam[],
    inputFiles?: InputFile[],
  ): ChatCompletionMessageParam[] {
    const currentMessages: ChatCompletionMessageParam[] = [
      { content: instructions, role: "system" },
    ];

    for (const inputFile of inputFiles ?? []) {
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

      if (inputFile.description !== undefined) {
        content.push({ text: inputFile.description, type: "text" });
      }

      // Chat Completions API only supports image_url for images, not arbitrary files
      if (inputFile.mimeType.startsWith("image/")) {
        content.push({
          image_url: {
            detail: "auto",
            url: `data:${inputFile.mimeType};base64,${inputFile.base64}`,
          },
          type: "image_url",
        });
      } else if (inputFile.mimeType === "application/pdf") {
        // Chat Completions API file type only supports PDFs
        content.push({
          file: {
            file_data: `data:${inputFile.mimeType};base64,${inputFile.base64}`,
            filename: inputFile.description ?? "",
          },
          type: "file",
        });
      } else {
        // For other file types, decode base64 and include as text
        const decodedContent = Buffer.from(inputFile.base64, "base64").toString(
          "utf-8",
        );
        content.push({
          text: decodedContent,
          type: "text",
        });
      }

      if (content.length > 0) {
        currentMessages.push({
          content,
          role: "user",
        });
      }
    }

    return [...currentMessages, ...(previousMessages ?? [])];
  }
}

/**
 * Combines optional system instructions with the image prompt.
 * @param instructions - Extra guidance for the image model
 * @param prompt - The main image prompt
 * @returns The prompt sent to the Image API
 */
function joinImagePrompt(
  instructions: string | undefined,
  prompt: string,
): string {
  if (instructions == null || instructions.length === 0) {
    return prompt;
  }

  return `${instructions}\n\n${prompt}`;
}

/**
 * Turns image attachments into Image API uploads.
 * @param inputFiles - Files attached to the model request
 * @returns Upload promises for each image
 */
function imageInputs(inputFiles: InputFile[] | undefined) {
  const files = inputFiles ?? [];
  const hasNonImage = files.some(
    (inputFile) => !inputFile.mimeType.startsWith("image/"),
  );
  if (hasNonImage) {
    throw new BadRequestException(
      "OpenAI image generation only accepts image inputs.",
    );
  }

  return files.map((inputFile, index) => {
    const extension = inputFile.mimeType.split("/")[1] ?? "png";
    return toFile(
      Buffer.from(inputFile.base64, "base64"),
      `reference-${index}.${extension}`,
      { type: inputFile.mimeType },
    );
  });
}

/**
 * Writes an OpenAI image payload to a temp file.
 * @param image - PNG bytes returned by the Image API
 * @returns Absolute path of the staged file
 */
function writeOpenAIImageFile(image: Buffer): string {
  const directory = join(tmpdir(), "towers-of-coreborn-openai-media");
  mkdirSync(directory, { recursive: true });
  const filePath = join(directory, `${crypto.randomUUID()}.png`);
  writeFileSync(filePath, image);
  return filePath;
}
