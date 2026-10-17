import type { RemoveExtendsString } from "./removeExtendsString";

export interface StreamingService {
  /**
   * The payload for the service call.
   */
  payload: unknown | null;
  /**
   * If true, the endpoint will return a stream of data.
   */
  streaming: true;
  /**
   * The chunk response from the service call.
   */
  chunk: unknown;
  /**
   * The finish response from the service call.
   */
  finish: unknown;
}

export interface NonStreamingService {
  /**
   * The payload for the service call.
   */
  payload: unknown | null;
  /**
   * If false, the endpoint will not return a stream of data.
   */
  streaming?: false;
  /**
   * The response from the service call.
   */
  response: unknown;
}

export interface FileDownloadService {
  /**
   * The payload for the service call.
   */
  payload: unknown | null;
  /**
   * If true, the endpoint will return a file download. This will be a blob.
   */
  fileDownload: true;
}

export interface FileUploadService {
  /**
   * The payload for the service call.
   */
  payload: unknown | null;
  /**
   * The response from the service call.
   */
  response: unknown;
  /**
   * If true, the endpoint will return a file upload. This will be a blob.
   */
  fileUpload: true;
  /**
   * If true, the endpoint accepts multiple files.
   * When true, use FilesInterceptor and @UploadedFiles in the controller.
   */
  multipleFiles?: boolean;
}

/**
 * The implementation for a service, used to differentiate between streaming, non-streaming, and file download/upload services.
 */
export type ServiceImplementation =
  | StreamingService
  | NonStreamingService
  | FileDownloadService
  | FileUploadService;

/**
 * Used to declare the interface (payloads and responses) for a service definition.
 */
export interface Service {
  [key: string]: ServiceImplementation;
}

/**
 * The endpoint definition for a service, which allows us to define the method and path for the endpoint.
 */
export interface ServiceEndpointBaseDefinition {
  /**
   * The method for the endpoint.
   */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /**
   * The path for the endpoint.
   */
  path: string;
}

/**
 * The endpoint definition for a streaming service, which allows us to define the method and path for the endpoint.
 */
export interface ServiceEndpointStreamingDefinition
  extends ServiceEndpointBaseDefinition {
  /**
   * The method for the endpoint. Payloads will be converted into query parameters.
   */
  method: "GET";
  /**
   * If the endpoint is streaming, the response will be a stream of data.
   */
  streaming: true;
}

export interface FileDownloadDetails {
  /**
   * The extension of the file to download.
   */
  extension: string;
}

export interface ServiceEndpointFileDownloadDefinition
  extends ServiceEndpointBaseDefinition {
  /**
   * The method for the endpoint.
   */
  method: "POST";
  /**
   * If true, the endpoint will return a file download. This will be a blob.
   */
  fileDownload: true;
  /**
   * The details of the file to download.
   */
  fileDetails: FileDownloadDetails;
}

export interface ServiceEndpointFileUploadDefinition
  extends ServiceEndpointBaseDefinition {
  /**
   * The method for the endpoint.
   */
  method: "POST";
  /**
   * If true, the endpoint will return a file upload. This will be a blob.
   */
  fileUpload: true;
  /**
   * The field name for the file upload.
   * This is the name of the field in the multipart form data.
   */
  fieldName: string;
  /**
   * If true, the endpoint accepts multiple files.
   * When true, use FilesInterceptor and @UploadedFiles in the controller.
   */
  multipleFiles?: boolean;
}

/**
 * The endpoint definition for a service, which allows us to define the method and path for the endpoint.
 * Convenience type for the endpoint definition, which allows us to define the endpoint as a string, a base definition, a streaming definition, or a file download definition.
 */
export type ServiceEndpointDefinition =
  | string
  | ServiceEndpointBaseDefinition
  | ServiceEndpointStreamingDefinition
  | ServiceEndpointFileDownloadDefinition
  | ServiceEndpointFileUploadDefinition;

/**
 * Check if the endpoint is a non-streaming endpoint.
 */
export function isServiceEndpointDefinition(
  endpoint: ServiceEndpointDefinition,
): endpoint is ServiceEndpointBaseDefinition {
  return (
    typeof endpoint !== "string" &&
    (endpoint as ServiceEndpointStreamingDefinition).streaming === undefined &&
    (endpoint as ServiceEndpointFileDownloadDefinition).fileDownload ===
      undefined
  );
}

/**
 * Check if the endpoint is a streaming endpoint.
 */
export function isServiceEndpointStreamingDefinition(
  endpoint: ServiceEndpointDefinition,
): endpoint is ServiceEndpointStreamingDefinition {
  return (
    typeof endpoint !== "string" &&
    (endpoint as ServiceEndpointStreamingDefinition).streaming
  );
}

/**
 * Check if the endpoint is a file download endpoint.
 */
export function isServiceEndpointFileDownloadDefinition(
  endpoint: ServiceEndpointDefinition,
): endpoint is ServiceEndpointFileDownloadDefinition {
  return (
    typeof endpoint !== "string" &&
    (endpoint as ServiceEndpointFileDownloadDefinition).fileDownload
  );
}

/**
 * Check if the endpoint is a file upload endpoint.
 */
export function isServiceEndpointFileUploadDefinition(
  endpoint: ServiceEndpointDefinition,
): endpoint is ServiceEndpointFileUploadDefinition {
  return (
    typeof endpoint !== "string" &&
    (endpoint as ServiceEndpointFileUploadDefinition).fileUpload
  );
}

/**
 * The endpoint for a service, which allows us to define the method and path for the endpoint.
 *
 * By default, all endpoints are POST routes, defined as `${controller}/${endpoint}`.
 * If you want to use a GET (or other method) route, you can define the endpoint as a string, or as a ServiceEndpointDefinition.
 *
 * If the endpoint is declared as a streaming endpoint, this type will enforce the use of a ServiceEndpointStreamingDefinition.
 */
export type ServiceEndpoint<
  S extends Service,
  Key extends keyof S,
> = S[Key] extends StreamingService
  ? ServiceEndpointStreamingDefinition
  : S[Key] extends FileDownloadService
    ? ServiceEndpointFileDownloadDefinition
    : S[Key] extends FileUploadService
      ? ServiceEndpointFileUploadDefinition
      : Key | ServiceEndpointBaseDefinition;

/**
 * Used to declare the interface for the expected backend implementation service.
 * All routes are POST routes, defined as `${controller}/${endpoint}`.
 */
export type ServiceDefinition<S extends Service> = {
  /**
   * The controller name for the service.
   */
  controller: string;
  /**
   * The endpoints for the service. This is how the frontend will call on the service.
   */
  endpoints: {
    [Key in keyof RemoveExtendsString<S>]: ServiceEndpoint<S, Key>;
  };
};
