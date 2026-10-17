import { Module } from "@nestjs/common";
import { ConfigurationModule } from "../configuration/configuration.module";
import { PrismaService } from "./prisma.service";

@Module({
  exports: [PrismaService],
  imports: [ConfigurationModule],
  providers: [PrismaService],
})
export class PrismaModule {}
