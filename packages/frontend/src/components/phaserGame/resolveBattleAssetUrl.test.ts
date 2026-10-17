import { describe, expect, test } from "bun:test";
import { resolveBattleAssetUrl } from "./resolveBattleAssetUrl";

const ORIGIN = "https://localhost:8080";

describe("resolveBattleAssetUrl", () => {
  test("drops blank values", () => {
    expect(resolveBattleAssetUrl("  ", ORIGIN)).toBeUndefined();
  });

  test("prefixes a static path with the backend origin", () => {
    expect(
      resolveBattleAssetUrl(
        "/static/card-characters/set 1/level-1.png",
        ORIGIN,
      ),
    ).toBe("https://localhost:8080/static/card-characters/set%201/level-1.png");
  });

  test("does not double-encode a path that is already escaped", () => {
    expect(
      resolveBattleAssetUrl(
        "/static/playable-cards/set%201/manifest.json",
        `${ORIGIN}/`,
      ),
    ).toBe(
      "https://localhost:8080/static/playable-cards/set%201/manifest.json",
    );
  });

  test("keeps an absolute workshop URL", () => {
    const url = "https://localhost:8080/static/playable-cards/card-1/card.png";
    expect(resolveBattleAssetUrl(url, ORIGIN)).toBe(url);
  });

  test("returns a root-relative path when no backend origin is configured", () => {
    expect(resolveBattleAssetUrl("/static/playable-cards/a/card.png", "")).toBe(
      "/static/playable-cards/a/card.png",
    );
  });
});
