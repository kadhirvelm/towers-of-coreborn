import { Module } from "@nestjs/common";
import { TowersOfCorebornAgentService } from "./shared/towersOfCorebornAgent.service";
import { TowersOfCorebornAgentToolRegistry } from "./shared/towersOfCorebornAgentToolRegistry";

/**
 * Shared agent infrastructure. Asset-class agents extend
 * `TowersOfCorebornAgentService` and are provided by their own asset-class module.
 */
@Module({
  exports: [TowersOfCorebornAgentService, TowersOfCorebornAgentToolRegistry],
  providers: [TowersOfCorebornAgentService, TowersOfCorebornAgentToolRegistry],
})
export class MastraModule {}
