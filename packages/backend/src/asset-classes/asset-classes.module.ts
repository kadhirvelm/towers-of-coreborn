import { Module } from "@nestjs/common";
import { CardCharacterModule } from "./card-character/card-character.module";

/**
 * Every generatable asset class. Each class is a self-contained module with
 * its own controller (`generate` + `list`), coordinator agent, tool, and storage folder.
 */
@Module({
  imports: [CardCharacterModule],
})
export class AssetClassesModule {}
