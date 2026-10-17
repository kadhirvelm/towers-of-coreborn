export type StreamEventType = "loading" | "chunk" | "finish" | "error";

export interface StreamEventBase {
  /**
   * The number of the chunk.
   */
  id: string;
  /**
   * The type of the event.
   */
  type: StreamEventType;
}

/**
 * The event that is sent to the client when the stream is loading.
 */
export interface StreamingEventLoading extends StreamEventBase {
  type: "loading";
}

/**
 * The event that is streamed to the client when the stream is updated.
 */
export interface StreamingEventChunk<T> extends StreamEventBase {
  data: T;
  type: "chunk";
}

/**
 * The event that is streamed to the client when the stream is finished.
 */
export interface StreamingEventFinish<T> extends StreamEventBase {
  data: T;
  type: "finish";
}

/**
 * The event that is streamed to the client when the stream is errored.
 */
export interface StreamingEventError extends StreamEventBase {
  data: {
    message: string;
  };
  type: "error";
}

/**
 * The event that is streamed to the client.
 */
export type StreamingEvent<Chunk, Finish> =
  | StreamingEventLoading
  | StreamingEventChunk<Chunk>
  | StreamingEventFinish<Finish>
  | StreamingEventError;
