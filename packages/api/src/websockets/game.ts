import type {
  WebsocketEvents,
  WebsocketEventsDefinition,
} from "../genericTypes/websocket";

/**
 * WebSocket events for document collaboration.
 */
export interface RoomWebsocketEvents extends WebsocketEvents {
  /**
   * Events sent from client to server.
   */
  clientToServer: {
    /**
     * Join the review room to receive updates.
     */
    joinRoom: {
      payload: {
        roomName: string;
      };
    };
    /**
     * Leave the review room.
     */
    leaveRoom: {
      payload: {
        roomName: string;
      };
    };
  };
  /**
   * Events sent from server to client.
   */
  serverToClient: {
    /**
     * Emitted when the review state changes.
     */
    roomStateChanged: {
      response: { game: string };
    };
  };
}

/**
 * Definition for review WebSocket events.
 * Use this to reference event names in gateways.
 */
export const RoomEventsDefinition: WebsocketEventsDefinition<RoomWebsocketEvents> =
  {
    clientToServer: {
      joinRoom: "joinRoom",
      leaveRoom: "leaveRoom",
    },
    serverToClient: {
      roomStateChanged: "roomStateChanged",
    },
  };
