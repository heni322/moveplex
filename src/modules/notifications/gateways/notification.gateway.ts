import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

// Define notification data type
export type NotificationData = Record<string, unknown>;

// Define notification interface
export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: NotificationData;
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected to notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('user:subscribe')
  handleUserSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    void client.join(`user:${data.userId}`);
    this.logger.log(`User ${data.userId} subscribed to notifications`);
  }

  sendNotificationToUser(userId: string, notification: NotificationPayload): void {
    this.server.to(`user:${userId}`).emit('notification:received', {
      ...notification,
      timestamp: new Date(),
    });
  }

  sendBroadcastNotification(notification: NotificationPayload): void {
    this.server.emit('notification:broadcast', {
      ...notification,
      timestamp: new Date(),
    });
  }
}
