import { Injectable } from "@nestjs/common";
import { ConnectedSocket, MessageBody } from "@nestjs/websockets";
import {
  RoomEventsDefinition,
  RoomWebsocketEvents,
} from "@towers-of-coreborn/api";
import {
  getSocketDecorator,
  SocketGatewayHandler,
} from "src/websockets/socket";
import { SocketGateway } from "src/websockets/socket.gateway";
import { type TypedSocketClient } from "src/websockets/types";

/**
 * WebSocket namespace for the game: room join/leave and test broadcasts.
 */
@Injectable()
export class GameRoomGateway
  extends SocketGateway<RoomWebsocketEvents>
  implements SocketGatewayHandler<RoomWebsocketEvents>
{
  constructor() {
    super(RoomEventsDefinition);
  }

  @getSocketDecorator(RoomEventsDefinition.clientToServer.joinRoom)
  async joinRoom(
    @MessageBody()
    payload: RoomWebsocketEvents["clientToServer"]["joinRoom"]["payload"],
    @ConnectedSocket() client: TypedSocketClient,
  ) {
    const { roomName } = payload;

    await client.join(roomName);

    const emitter = this.getServerEmitter(roomName);
    emitter.roomStateChanged({
      game: "Hello World",
    });
  }

  @getSocketDecorator(RoomEventsDefinition.clientToServer.leaveRoom)
  async leaveRoom(
    @MessageBody()
    payload: RoomWebsocketEvents["clientToServer"]["leaveRoom"]["payload"],
    @ConnectedSocket() client: TypedSocketClient,
  ) {
    const { roomName } = payload;

    await client.leave(roomName);
  }
}
