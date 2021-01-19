import { WhiteboardService } from '@modules/whiteboard/service/whiteboard.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket, OnGatewayInit, WsResponse } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';


@WebSocketGateway(3002)
export class SocketGateway implements OnGatewayInit, OnGatewayDisconnect {
    constructor(
        private readonly configService: ConfigService,
        private readonly whiteboardService: WhiteboardService,
    ) { }

    private logger: Logger = new Logger('SocketGateway');

    @WebSocketServer() webSocketServer: Server

    afterInit(server: Server) {
        this.logger.log('Initialized SocketGateway');
    }

    handleConnection(client: Socket, message: { sender: string, room: string, message: string }) {
        this.logger.log(`[connection] from client (${client.id})`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`[disconnection] from client(${client.id})`);
    }

    @SubscribeMessage('messageToServer')
    handleMessageToServer(client: Socket, message: { sender: string, room: string, message: string }) {
        this.logger.log(`[messageToServer] from ${message.sender}(${client.id}) to ${message.room} "${message.message}"`);
        this.webSocketServer.to(message.room).emit('messageToClient', message);
    }

    @SubscribeMessage('createCanvasObjectClient')
    async handleCreateCanvasObject(client: Socket, message: { sender: string, room: string, message: JSON }) {
        const createdObjectMessage = await this.whiteboardService.addObjectOnWhiteboard(message.room, message.message);
        this.logger.log(`[createCanvasObject] from ${message.sender}(${client.id}) to ${message.room} "${message.message}"`);
        client.to(message.room).emit('createCanvasObjectServer', createdObjectMessage);
    }

    @SubscribeMessage('deleteCanvasObjectClient')
    async handleDeleteCanvasObject(client: Socket, message: { sender: string, room: string, message: JSON }) {
        const deletedObjectMessage = await this.whiteboardService.removeObjectOnWhiteboard(message.room, message.message);
        this.logger.log(`[deleteCanvasObject] from ${message.sender}(${client.id}) to ${message.room} "${message.message}"`);
        client.to(message.room).emit('deleteCanvasObjectServer', deletedObjectMessage);
    }

    @SubscribeMessage('updateCanvasObjectClient')
    async handleUpdateCanvasObject(client: Socket, message: { sender: string, room: string, message: JSON }) {
        const updatedObjectMessage = await this.whiteboardService.updateObjectOnWhiteboard(message.room, message.message);
        this.logger.log(`[updateCanvasObject] from ${message.sender}(${client.id}) to ${message.room} "${message.message}"`);
        client.to(message.room).emit('updateCanvasObjectServer', updatedObjectMessage);
    }

    @SubscribeMessage('joinWhiteboard')
    handleJoinRoom(client: Socket, message: { sender: string, room: string, message: string }) {
        this.logger.log(`[joinWhiteboard] ${message.sender}(${client.id}) joins ${message.room}`);
        client.join(message.room);
        client.emit('joinedWhiteboard', message.room);
    }

    @SubscribeMessage('leaveWhiteboard')
    handleLeaveRoom(client: Socket, message: { sender: string, room: string, message: string }) {
        this.logger.log(`[leaveWhiteboard] ${message.sender}(${client.id}) leaves ${message.room}`);
        client.leave(message.room);
        client.emit('leftWhiteboard', message.room);
    }

}