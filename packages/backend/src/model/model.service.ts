import { BadRequestException, Injectable } from "@nestjs/common";
import { AnthropicService } from "./anthropic.service";
import { GeminiService } from "./gemini.service";
import { OpenAIService } from "./openAI.service";
import { ModelRequestReturnType } from "./types/modelRequestTypes";
import {
  AllChatProvidersRequestVisitor,
  AllProvidersRequestVisitor,
  ValidChatProviderRequest,
  ValidProviderRequest,
} from "./types/modelRequestVisitors";

@Injectable()
export class ModelService {
  public constructor(
    private anthropicService: AnthropicService,
    private openAIService: OpenAIService,
    private geminiService: GeminiService,
  ) {}

  public async requestTextCompletion<Request extends ValidProviderRequest>(
    request: Request,
  ): Promise<ModelRequestReturnType<Request>> {
    const maybeOnEvent = request.onEvent;
    if (maybeOnEvent !== undefined) {
      return AllProvidersRequestVisitor.visit(request, {
        anthropic: (request) =>
          this.anthropicService.requestTextCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        gemini: (request) =>
          this.geminiService.requestTextCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        "open-ai": (request) =>
          this.openAIService.requestTextCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        unknown: (request) => {
          throw new BadRequestException(
            `Unsupported model type: ${(request as Request).type}`,
          );
        },
      });
    }

    return AllProvidersRequestVisitor.visit(request, {
      anthropic: (request) =>
        this.anthropicService.requestTextCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      gemini: (request) =>
        this.geminiService.requestTextCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      "open-ai": (request) =>
        this.openAIService.requestTextCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      unknown: (request) => {
        throw new BadRequestException(
          `Unsupported model type: ${(request as Request).type} for text completion.`,
        );
      },
    });
  }

  /**
   * Useful for ensuring chain of thought reasoning. The messages will get sent in the order requested. Also helpful for chat-based UIs.
   */
  public async requestChatCompletion<Request extends ValidChatProviderRequest>(
    request: Request,
  ): Promise<ModelRequestReturnType<Request>> {
    const maybeOnEvent = request.onEvent;
    if (maybeOnEvent !== undefined) {
      return AllChatProvidersRequestVisitor.visit(request, {
        anthropic: (request) =>
          this.anthropicService.requestChatCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        gemini: (request) =>
          this.geminiService.requestChatCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        "open-ai": (request) =>
          this.openAIService.requestChatCompletionStream(
            request,
            maybeOnEvent,
          ) as Promise<ModelRequestReturnType<Request>>,
        unknown: (request) => {
          throw new BadRequestException(
            `Unsupported model type: ${(request as Request).type}`,
          );
        },
      });
    }

    return AllChatProvidersRequestVisitor.visit(request, {
      anthropic: (request) =>
        this.anthropicService.requestChatCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      gemini: (request) =>
        this.geminiService.requestChatCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      "open-ai": (request) =>
        this.openAIService.requestChatCompletion(request) as Promise<
          ModelRequestReturnType<Request>
        >,
      unknown: (request) => {
        throw new BadRequestException(
          `Unsupported model type: ${(request as Request).type} for chat completion.`,
        );
      },
    });
  }
}
