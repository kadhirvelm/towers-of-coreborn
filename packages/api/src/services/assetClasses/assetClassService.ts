import type { Service } from "../../genericTypes/service";

/**
 * Default generate payload: a natural-language description of the asset.
 */
export interface AssetGenerationPayload {
  prompt: string;
}

/**
 * Contract every asset class exposes. Each class gets its own controller, so
 * routes are `POST /{controller}/generate` and `POST /{controller}/list`.
 * @typeParam GeneratedAsset - Response after generating and storing one asset
 * @typeParam ListResponse - Response listing stored assets of this class
 * @typeParam GeneratePayload - Request body for generation
 */
export interface AssetClassServiceApi<
  GeneratedAsset,
  ListResponse,
  GeneratePayload = AssetGenerationPayload,
> extends Service {
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
  generate: "generate",
  list: "list",
} as const;
