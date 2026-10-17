import { Socket } from "socket.io";

/**
 * Inter-server events.
 */
export type InterServerEvents = { [key: string]: unknown };

export interface SocketData {
  /**
   * The user that is connected to the socket.
   */
  user: unknown | null;
}

/**
 * Typed Socket.IO socket for the application's WebSocket events.
 */
export type TypedSocketClient = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  InterServerEvents,
  SocketData
>;
