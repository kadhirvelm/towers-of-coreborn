import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        enabled: false, // Disable logging, nothing will be printed to console
      },
    }),
  ],
})
export class MockLoggerModule {}
