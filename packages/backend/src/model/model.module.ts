import { Module } from "@nestjs/common";
import { ConfigurationModule } from "src/configuration/configuration.module";
import { AnthropicService } from "./anthropic.service";
import { GeminiService } from "./gemini.service";
import { ModelService } from "./model.service";
import { OpenAIService } from "./openAI.service";

@Module({
  exports: [ModelService],
  imports: [ConfigurationModule],
  providers: [ModelService, OpenAIService, GeminiService, AnthropicService],
})
export class ModelModule {}
