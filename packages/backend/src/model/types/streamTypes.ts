export interface StreamLoading {
  /**
   * The type of the event.
   */
  type: "loading";
}

/**
 * The event that is sent when the stream is updated. It contains the delta of the stream.
 */
export interface StreamDelta {
  /**
   * The delta of the stream. Be sure to aggregate these to get the final text. It will also
   * be sent in one final event with the type "finish".
   */
  delta: string;
  /**
   * The type of the event.
   */
  type: "delta";
}

/**
 * The event that is sent when the stream is finished. It contains the final text of the stream.
 */
export interface StreamFinish {
  /**
   * The final text of the stream.
   */
  text: string;
  /**
   * The type of the event.
   */
  type: "finish";
}

export interface StreamAudioDelta {
  /**
   * The audio data of the stream.
   */
  type: "audio_delta";
  /**
   * The audio data of the stream.
   */
  audioData: string;
  /**
   * The MIME type of the audio data.
   */
  mimeType: string;
}

export interface StreamAudioFinish {
  /**
   * The type of the event.
   */
  type: "audio_finish";
  /**
   * The audio data of the stream.
   */
  audioData: string;
  /**
   * The MIME type of the audio data.
   */
  mimeType: string;
}

export type StreamEvent =
  | StreamLoading
  | StreamDelta
  | StreamFinish
  | StreamAudioDelta
  | StreamAudioFinish;
