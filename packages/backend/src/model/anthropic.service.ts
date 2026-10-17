import Anthropic from "@anthropic-ai/sdk";
import { Stream } from "@anthropic-ai/sdk/core/streaming";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigurationService } from "src/configuration/configuration.service";
import {
  InputFile,
  ModelChatRequest,
  ModelRequest,
  ModelRequestReturnType,
  PreviousMessage,
} from "./types/modelRequestTypes";
import { StreamEvent } from "./types/streamTypes";

/** Note: this is the arbitrary limit for the Anthropic API since it requires one. Not sure if this number is tuned correctly. */
const DEFAULT_MAX_TOKENS = 12_000;

/** Web search tool configuration for Anthropic API */
const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
  name: "web_search",
  type: "web_search_20250305",
};

@Injectable()
export class AnthropicService {
  private anthropicClient: Anthropic | undefined;

  public constructor(private configurationService: ConfigurationService) {
    const anthropicKey = this.configurationService.get("ANTHROPIC_API_KEY");
    if (anthropicKey == null || anthropicKey.length === 0) {
      return;
    }

    this.anthropicClient = new Anthropic({
      apiKey: anthropicKey,
    });
  }

  public async requestTextCompletion<
    Request extends ModelRequest<"anthropic">,
  >({
    prompt,
    inputFiles,
    instructions,
    model,
    temperature,
    tools,
    schema,
    maxTokens,
  }: Request): Promise<ModelRequestReturnType<Request>> {
    if (this.anthropicClient == null) {
      throw new InternalServerErrorException(
        "Anthropic client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      throw new BadRequestException(
        "Audio output is not supported for Anthropic models. Use OpenAI or Gemini instead.",
      );
    }

    const response = await this.anthropicClient.beta.messages.create({
      betas: ["structured-outputs-2025-11-13", "context-1m-2025-08-07"],
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        { content: instructions ?? "", role: "assistant" },
        { content: this.assembleContent(prompt, inputFiles), role: "user" },
      ],
      model: model,
      output_format:
        typeof schema === "object"
          ? {
              schema: schema as { [key: string]: unknown },
              type: "json_schema" as const,
            }
          : undefined,
      temperature,
      tools: this.getToolsWithWebSearch(tools),
    });

    return this.handleResponseType(
      response,
      schema,
    ) as ModelRequestReturnType<Request>;
  }

  public async requestTextCompletionStream<
    Request extends ModelRequest<"anthropic">,
  >(
    {
      prompt,
      inputFiles,
      instructions,
      model,
      temperature,
      tools,
      maxTokens,
      schema,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (this.anthropicClient == null) {
      throw new InternalServerErrorException(
        "Anthropic client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      throw new BadRequestException(
        "Audio output is not supported for Anthropic models. Use OpenAI or Gemini instead.",
      );
    }

    const response = await this.anthropicClient.beta.messages.create({
      betas: ["structured-outputs-2025-11-13", "context-1m-2025-08-07"],
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        { content: instructions ?? "", role: "assistant" },
        { content: this.assembleContent(prompt, inputFiles), role: "user" },
      ],
      model: model,
      stream: true,
      temperature,
      tools: this.getToolsWithWebSearch(tools),
    });

    const finalResponse = await this.handleResponseStream(response, onEvent);

    if (typeof schema === "object") {
      return JSON.parse(finalResponse);
    }

    return finalResponse as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletion<
    Request extends ModelChatRequest<"anthropic">,
  >({
    inputFiles,
    inputMessagesOrdered,
    instructions,
    model,
    previousMessages,
    temperature,
    tools,
    schema,
    onCompletion,
    maxTokens,
  }: Request): Promise<ModelRequestReturnType<Request>> {
    if (this.anthropicClient == null) {
      throw new InternalServerErrorException(
        "Anthropic client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      throw new BadRequestException(
        "Audio output is not supported for Anthropic models. Use OpenAI or Gemini instead.",
      );
    }

    const translatedPreviousMessages = this.translatePreviousMessagesToMessages(
      previousMessages ?? [],
      inputFiles,
    );

    const currentMessages: Anthropic.Messages.MessageParam[] = [
      { content: instructions ?? "", role: "assistant" },
      ...translatedPreviousMessages,
    ];

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentMessages.push({ content: message, role: "user" });

      const response = await this.anthropicClient.beta.messages.create({
        betas: ["structured-outputs-2025-11-13", "context-1m-2025-08-07"],
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: currentMessages,
        model: model,
        temperature,
        tools: this.getToolsWithWebSearch(tools),
      });

      onCompletion?.(index);

      const result = this.handleResponseType(response, "string");
      currentMessages.push({ content: result, role: "assistant" });
    }

    const latestMessage = currentMessages[currentMessages.length - 1];
    if (latestMessage == null) {
      throw new Error("No latest message found");
    }

    if (typeof schema === "object") {
      return JSON.parse(latestMessage.content as string);
    }

    return latestMessage.content as ModelRequestReturnType<Request>;
  }

  public async requestChatCompletionStream<
    Request extends ModelChatRequest<"anthropic">,
  >(
    {
      inputFiles,
      inputMessagesOrdered,
      instructions,
      model,
      previousMessages,
      temperature,
      tools,
      schema,
      onCompletion,
      maxTokens,
    }: Request,
    onEvent: (event: StreamEvent) => void,
  ): Promise<ModelRequestReturnType<Request>> {
    if (this.anthropicClient == null) {
      throw new InternalServerErrorException(
        "Anthropic client not initialized - please check the server configuration",
      );
    }

    if (schema === "audio") {
      throw new BadRequestException(
        "Audio output is not supported for Anthropic models. Use OpenAI or Gemini instead.",
      );
    }

    const translatedPreviousMessages = this.translatePreviousMessagesToMessages(
      previousMessages ?? [],
      inputFiles,
    );

    const currentMessages: Anthropic.Messages.MessageParam[] = [
      { content: instructions ?? "", role: "assistant" },
      ...translatedPreviousMessages,
    ];

    for (const [index, message] of inputMessagesOrdered.entries()) {
      currentMessages.push({ content: message, role: "user" });

      const response = await this.anthropicClient.beta.messages.create({
        betas: ["structured-outputs-2025-11-13", "context-1m-2025-08-07"],
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: currentMessages,
        model: model,
        stream: true,
        temperature,
        tools: this.getToolsWithWebSearch(tools),
      });

      const finalResponse = await this.handleResponseStream(response, onEvent);

      onCompletion?.(index);
      currentMessages.push({ content: finalResponse, role: "assistant" });
    }

    const latestMessage = currentMessages[currentMessages.length - 1];
    if (latestMessage == null) {
      throw new Error("No latest message found");
    }

    if (typeof schema === "object") {
      return JSON.parse(latestMessage.content as string);
    }

    return latestMessage.content as ModelRequestReturnType<Request>;
  }

  private translatePreviousMessagesToMessages(
    previousMessages: PreviousMessage[],
    inputFiles?: InputFile[],
  ): Anthropic.Messages.MessageParam[] {
    const messages: Anthropic.Messages.MessageParam[] =
      this.getInputFilesParts(inputFiles);

    for (const message of previousMessages) {
      const translatedRole = (() => {
        if (message.role === "system") {
          return "assistant";
        }

        return message.role;
      })();

      messages.push({
        content: message.content,
        role: translatedRole,
      });
    }

    return messages;
  }

  /**
   * Gets the parts for the input files and returns them as a MessageParam array.
   *
   * @param inputFiles - The input files to get the parts for.
   * @returns The parts for the input files as a MessageParam array.
   */
  private getInputFilesParts(
    inputFiles?: InputFile[],
  ): Anthropic.Messages.MessageParam[] {
    const messages: Anthropic.Messages.MessageParam[] = [];

    for (const inputFile of inputFiles ?? []) {
      const content: Anthropic.Messages.ContentBlockParam[] = [];

      if (inputFile.description !== undefined) {
        content.push({ text: inputFile.description, type: "text" });
      }

      if (inputFile.mimeType.startsWith("image/")) {
        content.push({
          source: {
            data: inputFile.base64,
            media_type:
              inputFile.mimeType as Anthropic.Messages.Base64ImageSource["media_type"],
            type: "base64",
          },
          type: "image",
        });
      } else if (inputFile.mimeType === "application/pdf") {
        // Anthropic document type only supports PDFs
        content.push({
          source: {
            data: inputFile.base64,
            media_type:
              inputFile.mimeType as Anthropic.Messages.Base64PDFSource["media_type"],
            type: "base64",
          },
          type: "document",
        });
      } else {
        // For other file types, decode base64 and include as text
        const decodedContent = Buffer.from(inputFile.base64, "base64").toString(
          "utf-8",
        );
        content.push({ text: decodedContent, type: "text" });
      }

      messages.push({
        content,
        role: "user",
      });
    }

    return messages;
  }

  private async handleResponseStream(
    response: Stream<Anthropic.Beta.Messages.BetaRawMessageStreamEvent>,
    onEvent: (event: StreamEvent) => void,
  ): Promise<string> {
    let finalText = "";

    for await (const event of response) {
      if (event.type === "message_start") {
        onEvent({
          type: "loading",
        });
      }

      if (event.type === "content_block_delta") {
        const extractedText = this.extractTextFromContentBlockDelta(
          event.delta,
        );
        finalText += extractedText;

        onEvent({
          delta: extractedText,
          type: "delta",
        });
      }

      if (event.type === "message_stop") {
        onEvent({
          text: finalText,
          type: "finish",
        });
      }
    }

    return finalText;
  }

  /**
   * Pulls display text out of a beta message stream delta.
   * Compaction deltas contribute their summary content; unknown frames contribute nothing.
   * @param delta - Content-block delta from a beta messages stream
   * @returns Text to append to the accumulated response
   */
  private extractTextFromContentBlockDelta(
    delta: Anthropic.Beta.Messages.BetaRawContentBlockDelta,
  ): string {
    if (delta.type === "text_delta") {
      return delta.text;
    }

    if (delta.type === "signature_delta") {
      return delta.signature;
    }

    if (delta.type === "citations_delta") {
      return delta.citation.cited_text;
    }

    if (delta.type === "input_json_delta") {
      return delta.partial_json;
    }

    if (delta.type === "compaction_delta") {
      return delta.content ?? "";
    }

    return delta.thinking;
  }

  /**
   * Extracts text content from an Anthropic API response, handling multiple content block types.
   * When web search is enabled, responses may include server_tool_use and web_search_tool_result
   * blocks in addition to text blocks.
   * @param response - The Anthropic API response
   * @param schema - Optional schema for JSON parsing
   * @returns The extracted text content
   */
  private handleResponseType(
    response: Anthropic.Beta.Messages.BetaMessage,
    schema: ModelRequest<"anthropic">["schema"],
  ): string {
    const textBlocks = response.content.filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    );
    const rawText =
      textBlocks.length > 0
        ? textBlocks.map((block) => block.text).join("")
        : "(no text)";

    // Check if response was truncated due to max_tokens
    if (response.stop_reason === "max_tokens") {
      throw new InternalServerErrorException(
        `Response was truncated due to max_tokens limit. Output tokens: ${response.usage?.output_tokens}. Raw text: ${rawText.slice(0, 100)}...`,
      );
    }

    if (textBlocks.length === 0) {
      throw new InternalServerErrorException(
        `No text content found in response. Content block types: ${response.content.map((b) => b.type).join(", ")}`,
      );
    }

    if (typeof schema === "object") {
      try {
        return JSON.parse(rawText);
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to parse JSON response: ${error}. Raw text: ${rawText.slice(0, 200)}...`,
        );
      }
    }

    return rawText;
  }

  /**
   * Merges the web search tool with any existing tools passed to the API.
   * @param tools - Optional array of existing tools
   * @returns Array of tools including the web search tool
   */
  private getToolsWithWebSearch(
    tools?: Anthropic.Messages.Tool[],
  ): (Anthropic.Messages.Tool | Anthropic.Messages.WebSearchTool20250305)[] {
    if (tools === undefined) {
      // return [WEB_SEARCH_TOOL];
      return [];
    }

    return [WEB_SEARCH_TOOL, ...tools];
  }

  private assembleContent(
    prompt: string,
    inputFiles?: InputFile[],
  ): Anthropic.Messages.ContentBlockParam[] | string {
    if (inputFiles === undefined) {
      return prompt;
    }

    const content: Anthropic.Messages.ContentBlockParam[] = [
      { text: prompt, type: "text" },
    ];

    for (const inputFile of inputFiles) {
      if (inputFile.description !== undefined) {
        content.push({ text: inputFile.description, type: "text" });
      }

      if (inputFile.mimeType.startsWith("image/")) {
        content.push({
          source: {
            data: inputFile.base64,
            media_type:
              inputFile.mimeType as Anthropic.Messages.Base64ImageSource["media_type"],
            type: "base64",
          },
          type: "image",
        });
      } else if (inputFile.mimeType === "application/pdf") {
        // Anthropic document type only supports PDFs
        content.push({
          source: {
            data: inputFile.base64,
            media_type:
              inputFile.mimeType as Anthropic.Messages.Base64PDFSource["media_type"],
            type: "base64",
          },
          type: "document",
        });
      } else {
        // For other file types, decode base64 and include as text
        const decodedContent = Buffer.from(inputFile.base64, "base64").toString(
          "utf-8",
        );
        content.push({ text: decodedContent, type: "text" });
      }
    }

    return content;
  }
}
