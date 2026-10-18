import { describe, expect, test } from "bun:test";
import { InternalServerErrorException } from "@nestjs/common";
import { resolveSingleToolChat } from "../resolveSingleToolChat";

const TOOL_ID = "create-example";

/**
 * @param overrides - Fields that differ from a run where the tool was never called
 * @returns A chat result the resolver can interpret
 */
function chatResult(
  overrides: Partial<{
    text: string;
    toolErrors: {
      errorMessage: string;
      toolCallId: string;
      toolName: string;
    }[];
    toolResults: { result: unknown; toolCallId: string; toolName: string }[];
  }> = {},
) {
  return {
    text: overrides.text ?? "",
    toolErrors: overrides.toolErrors ?? [],
    toolResults: overrides.toolResults ?? [],
  };
}

describe("resolveSingleToolChat", () => {
  test("returns the matching tool output and the agent text", () => {
    const resolved = resolveSingleToolChat({
      outputLabel: "Example generation",
      readToolOutput: (raw) => raw as { saved: boolean },
      result: chatResult({
        text: "done",
        toolResults: [
          {
            result: { saved: true },
            toolCallId: "call-1",
            toolName: TOOL_ID,
          },
        ],
      }),
      toolId: TOOL_ID,
    });

    expect(resolved.text).toBe("done");
    expect(resolved.toolOutput).toEqual({ saved: true });
  });

  test("ignores a different tool and fails when the required tool was never called", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => "unused",
        result: chatResult({
          text: "I could not do that.",
          toolResults: [
            { result: {}, toolCallId: "other", toolName: "some-other-tool" },
          ],
        }),
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof InternalServerErrorException).toBe(true);
  });

  test("includes the agent text when the required tool was never called", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => "unused",
        result: chatResult({ text: "I could not do that." }),
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof Error ? error.message : "").toContain(
      'Agent said: "I could not do that."',
    );
  });

  test("omits the agent suffix when the agent produced no text", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => "unused",
        result: chatResult({ text: "   " }),
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof Error ? error.message : "").toBe(
      `Example generation failed: the agent finished without calling ${TOOL_ID}.`,
    );
  });

  test("reports a tool error even when a later result looks successful", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => "unused",
        result: chatResult({
          toolErrors: [
            {
              errorMessage: "model down",
              toolCallId: "call-1",
              toolName: TOOL_ID,
            },
          ],
          toolResults: [
            {
              result: { saved: true },
              toolCallId: "call-2",
              toolName: TOOL_ID,
            },
          ],
        }),
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof Error ? error.message : "").toBe(
      "Example generation failed: model down",
    );
  });

  test("requires supporting tools to complete successfully", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => "unused",
        result: chatResult({
          toolResults: [
            {
              result: { saved: true },
              toolCallId: "call-1",
              toolName: TOOL_ID,
            },
          ],
        }),
        supportingToolIds: ["consult-productnow"],
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof Error ? error.message : "").toContain(
      "without calling consult-productnow",
    );
  });

  test("accepts successful supporting tools", () => {
    const resolved = resolveSingleToolChat({
      outputLabel: "Example generation",
      readToolOutput: (raw) => raw as { saved: boolean },
      result: chatResult({
        toolResults: [
          {
            result: { answer: "Lore" },
            toolCallId: "lore-1",
            toolName: "consult-productnow",
          },
          {
            result: { saved: true },
            toolCallId: "call-1",
            toolName: TOOL_ID,
          },
        ],
      }),
      supportingToolIds: ["consult-productnow"],
      toolId: TOOL_ID,
    });

    expect(resolved.toolOutput).toEqual({ saved: true });
  });

  test("lets the caller's reader reject a malformed tool result", () => {
    const error = catchError(() =>
      resolveSingleToolChat({
        outputLabel: "Example generation",
        readToolOutput: () => {
          throw new InternalServerErrorException("unexpected shape");
        },
        result: chatResult({
          toolResults: [
            { result: null, toolCallId: "call-1", toolName: TOOL_ID },
          ],
        }),
        toolId: TOOL_ID,
      }),
    );

    expect(error instanceof Error ? error.message : "").toBe(
      "unexpected shape",
    );
  });
});

/**
 * @param run - Call that is expected to throw
 * @returns The thrown value
 */
function catchError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}
