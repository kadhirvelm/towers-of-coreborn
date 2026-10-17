import { describe, expect, test } from "bun:test";
import { formatToolErrorMessage } from "../formatToolErrorMessage";

describe("formatToolErrorMessage", () => {
  test("returns the message of a plain Error", () => {
    expect(formatToolErrorMessage(new Error("boom"))).toBe("boom");
  });

  test("prefers the innermost cause when errors are wrapped", () => {
    const inner = new Error("Publisher model was not found");
    const wrapper = new Error("Tool execution failed", { cause: inner });
    expect(formatToolErrorMessage(wrapper)).toBe(
      "Publisher model was not found",
    );
  });

  test("reads message from error-like objects", () => {
    expect(formatToolErrorMessage({ message: "plain object" })).toBe(
      "plain object",
    );
  });

  test("falls back to String() for primitives", () => {
    expect(formatToolErrorMessage("text")).toBe("text");
    expect(formatToolErrorMessage(42)).toBe("42");
    expect(formatToolErrorMessage(undefined)).toBe("undefined");
  });

  test("falls back to String() for error-like objects with empty message", () => {
    expect(formatToolErrorMessage({ message: "" })).toBe("[object Object]");
  });
});
