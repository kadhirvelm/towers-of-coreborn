import { afterEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  CardCharacterAgent,
  CardCharacterAgentTool,
} from "../cardCharacterAgent";

describe("CardCharacterAgent", () => {
  let tempDirectory = "";

  afterEach(async () => {
    if (tempDirectory !== "") {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = "";
    }
  });

  test("gives the registered generate-image tool to the coordinator", async () => {
    const tool = { id: CardCharacterAgentTool.GenerateImage };
    const requestedTools: unknown[] = [];
    const buildTools = mock((tools: unknown) => {
      requestedTools.push(tools);
      return {
        [CardCharacterAgentTool.GenerateImage]: tool,
      };
    });
    const runGenerationCoordinator = mock(
      async (input: {
        instructions: string;
        tool: unknown;
        toolId: string;
      }) => {
        expect(input.tool).toBe(tool);
        expect(input.toolId).toBe(CardCharacterAgentTool.GenerateImage);
        expect(input.instructions).toContain("`generate-image`");
        expect(input.instructions).toContain("facing the viewer");
        return {
          text: "Workshop Apprentice through Clockwork Sovereign.",
          toolOutput: imageSet("/tmp/not-read"),
        };
      },
    );
    const saveGeneratedPortraits = mock(async () => ({ setId: "set-1" }));
    const agent = new CardCharacterAgent(
      { runGenerationCoordinator } as never,
      { buildTools } as never,
      { saveGeneratedPortraits } as never,
    );

    const result = await agent.query({
      prompt: "a soot-covered inventor who builds clockwork wings",
    });

    expect(requestedTools).toEqual([CardCharacterAgentTool]);
    expect(result).toEqual({
      setId: "set-1",
      summary: "Workshop Apprentice through Clockwork Sovereign.",
    });
    expect(saveGeneratedPortraits).toHaveBeenCalledTimes(1);
  });

  test("deletes generated files when the tool result is not a character set", async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "card-character-agent-"));
    const filePath = join(tempDirectory, `${randomUUID()}.png`);
    await sharp({
      create: {
        background: { alpha: 1, b: 10, g: 10, r: 10 },
        channels: 4,
        height: 64,
        width: 64,
      },
    })
      .png()
      .toFile(filePath);
    const runGenerationCoordinator = mock(async () => ({
      text: "only one image",
      toolOutput: {
        images: [{ filePath, name: "Lone", notes: "Not a set." }],
      },
    }));
    const agent = new CardCharacterAgent(
      { runGenerationCoordinator } as never,
      {
        buildTools: () => ({
          [CardCharacterAgentTool.GenerateImage]: { id: "tool" },
        }),
      } as never,
      {
        saveGeneratedPortraits: mock(async () => ({ setId: "unused" })),
      } as never,
    );

    const error = await agent.query({ prompt: "a knight" }).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    if (!(error instanceof Error)) {
      throw new Error("expected the character set to be rejected");
    }
    expect(error.message).toContain("generate-image");
    expect(await fileExists(filePath)).toBe(false);
  });
});

/**
 * @param filePath - Stand-in path; this result is not read from disk
 * @returns A generate-image payload the card-character reader accepts
 */
function imageSet(filePath: string) {
  return {
    aspectRatio: "3:4",
    imageSize: "1K",
    images: [1, 2, 3, 4].map((level) => ({
      filePath: `${filePath}-${level}`,
      name: `Stage ${level}`,
      notes: `Stage ${level} changes gear.`,
    })),
    theme: "Brass and soot.",
    usedFirstImageAsReference: true,
  };
}

/**
 * @param filePath - Path that may have been deleted
 * @returns Whether the file is still on disk
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
