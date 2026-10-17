import type { Service } from "../../genericTypes/service";

/**
 * HTTP status returned when a caller stops an in-flight asset generation.
 * The workshop treats this as a dismissal, not a failure.
 */
export const GENERATION_CANCELLED_STATUS = 499;

/**
 * Default generate payload: a natural-language description of the asset.
 */
export interface AssetGenerationPayload {
  /** Client id for this run. The same id stops it. */
  generationId: string;
  prompt: string;
}

/** Body of `POST /{controller}/cancel`. */
export interface CancelAssetGenerationPayload {
  /** Id sent with the in-flight `generate` call */
  generationId: string;
}

/** Whether a matching run was stopped, or will be stopped when it starts. */
export interface CancelAssetGenerationResponse {
  stopped: boolean;
}

/**
 * @param response - Value returned by a service caller
 * @returns Whether the backend stopped the generation on purpose
 */
export function isGenerationCancelled(response: unknown): boolean {
  if (typeof response !== "object" || response === null) {
    return false;
  }
  const error = response as { code?: unknown; type?: unknown };
  return error.type === "error" && error.code === GENERATION_CANCELLED_STATUS;
}

/**
 * Contract every asset class exposes. Each class gets its own controller, so
 * routes are `POST /{controller}/generate`, `POST /{controller}/cancel`, and
 * `POST /{controller}/list`.
 * @typeParam GeneratedAsset - Response after generating and storing one asset
 * @typeParam ListResponse - Response listing stored assets of this class
 * @typeParam GeneratePayload - Request body for generation
 */
export interface AssetClassServiceApi<
  GeneratedAsset,
  ListResponse,
  GeneratePayload = AssetGenerationPayload,
> extends Service {
  /** Stops an in-flight generation for this class */
  cancel: {
    payload: CancelAssetGenerationPayload;
    response: CancelAssetGenerationResponse;
  };
  /** Generates one asset, stores it, and returns where it was saved */
  generate: {
    payload: GeneratePayload;
    response: GeneratedAsset;
  };
  /** Lists the stored assets of this class */
  list: {
    payload: null;
    response: ListResponse;
  };
}

/** Endpoint names shared by every asset-class service definition. */
export const ASSET_CLASS_ENDPOINTS = {
  cancel: "cancel",
  generate: "generate",
  list: "list",
} as const;
