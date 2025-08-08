import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';


@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to notifications: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('user:subscribe')
  async handleUserSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user:${data.userId}`);
    this.logger.log(`User ${data.userId} subscribed to notifications`);
  }

  async sendNotificationToUser(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.server.to(`user:${userId}`).emit('notification:received', {
      ...notification,
      timestamp: new Date(),
    });
  }

  async sendBroadcastNotification(notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.server.emit('notification:broadcast', {
      ...notification,
      timestamp: new Date(),
    });
  }
}