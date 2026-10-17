import type { PlayableCardLoreSource } from "@towers-of-coreborn/api";
import { LORE_DOCUMENT_ID } from "./playableCardSpec";

const MAX_EXCERPTS = 4;
const MAX_EXCERPT_LENGTH = 800;

/**
 * Passages from a ProductNow search that belong to the Lore document.
 * Other documents in the same result are dropped.
 * @param raw - MCP `search` tool result, either the payload or a content envelope
 * @returns Up to four Lore excerpts
 */
export function parseLoreSearchResult(raw: unknown): PlayableCardLoreSource[] {
  const payload = unwrapSearchPayload(raw);
  if (!isRecord(payload) || !Array.isArray(payload.sources)) {
    return [];
  }

  const sources: PlayableCardLoreSource[] = [];
  for (const source of payload.sources) {
    appendLoreExcerpts(sources, source);
    if (sources.length >= MAX_EXCERPTS) {
      return sources.slice(0, MAX_EXCERPTS);
    }
  }
  return sources;
}

/**
 * Prefers structured MCP content, then a JSON text part, then the value itself.
 * @param raw - Tool result from ProductNow
 * @returns The search payload when one can be found
 */
function unwrapSearchPayload(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  if (isRecord(raw.structuredContent)) {
    return raw.structuredContent;
  }

  const text = readTextContent(raw.content);
  if (text === undefined || !text.trim().startsWith("{")) {
    return raw;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return raw;
  }
}

/**
 * @param content - MCP content array
 * @returns Joined text parts, when any exist
 */
function readTextContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) {
    return undefined;
  }

  const parts: string[] = [];
  for (const part of content) {
    if (!isRecord(part) || typeof part.text !== "string") {
      continue;
    }
    parts.push(part.text);
  }

  if (parts.length === 0) {
    return undefined;
  }
  return parts.join("\n");
}

/**
 * Adds Lore excerpts from one search source.
 * @param sources - Accumulator of accepted passages
 * @param source - One ProductNow search source
 */
function appendLoreExcerpts(
  sources: PlayableCardLoreSource[],
  source: unknown,
): void {
  if (!isRecord(source)) {
    return;
  }

  const documentId = readDocumentId(source);
  if (documentId !== LORE_DOCUMENT_ID) {
    return;
  }

  const title = readTitle(source);
  const url = typeof source.url === "string" ? source.url : "";
  if (!Array.isArray(source.excerpts)) {
    return;
  }

  for (const excerpt of source.excerpts) {
    const text = readExcerpt(excerpt);
    if (text === undefined) {
      continue;
    }
    sources.push({
      documentId,
      excerpt: text,
      title,
      url,
    });
    if (sources.length >= MAX_EXCERPTS) {
      return;
    }
  }
}

/**
 * @param source - Search source object
 * @returns The document id from the nested document or the source itself
 */
function readDocumentId(source: Record<string, unknown>): string | undefined {
  if (
    isRecord(source.document) &&
    typeof source.document.documentId === "string"
  ) {
    return source.document.documentId;
  }
  if (typeof source.documentId === "string") {
    return source.documentId;
  }
  if (typeof source.id === "string") {
    return source.id;
  }
  return undefined;
}

/**
 * @param source - Search source object
 * @returns A display title for the Lore document
 */
function readTitle(source: Record<string, unknown>): string {
  if (typeof source.title === "string" && source.title !== "") {
    return source.title;
  }
  if (isRecord(source.document) && typeof source.document.name === "string") {
    return source.document.name;
  }
  return "Lore";
}

/**
 * @param excerpt - One excerpt entry
 * @returns Trimmed excerpt text, capped in length
 */
function readExcerpt(excerpt: unknown): string | undefined {
  if (!isRecord(excerpt) || typeof excerpt.content !== "string") {
    return undefined;
  }
  const trimmed = excerpt.content.trim();
  if (trimmed === "") {
    return undefined;
  }
  return trimmed.slice(0, MAX_EXCERPT_LENGTH);
}

/**
 * @param value - Unknown JSON value
 * @returns Whether the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
