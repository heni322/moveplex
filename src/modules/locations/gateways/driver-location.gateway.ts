import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { LocationsService } from '../services/locations.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';


@WebSocketGateway({
  namespace: 'driver-tracking',
  cors: { origin: '*' },
})
export class DriverLocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DriverLocationGateway.name);
  private connectedDrivers = new Map<string, string>(); // socketId -> driverId

  constructor(private readonly locationsService: LocationsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Driver client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const driverId = this.connectedDrivers.get(client.id);
    if (driverId) {
      this.connectedDrivers.delete(client.id);
      this.logger.log(`Driver ${driverId} disconnected`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('driver:connect')
  async handleDriverConnect(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedDrivers.set(client.id, data.driverId);
    client.join(`driver:${data.driverId}`);
    this.logger.log(`Driver ${data.driverId} connected and joined room`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('driver:location_update')
  async handleLocationUpdate(
    @MessageBody() data: {
      driverId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Update location in database
      await this.locationsService.updateDriverLocation(data.driverId, {
        latitude: data.latitude,
        longitude: data.longitude,
      });

      // Broadcast to nearby riders and ride tracking
      this.server.emit('driver:location_changed', {
        driverId: data.driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(),
      });

      client.emit('driver:location_updated', { success: true });
    } catch (error) {
      client.emit('driver:location_updated', { success: false, error: error.message });
    }
  }

  @SubscribeMessage('driver:status_change')
  async handleDriverStatusChange(
    @MessageBody() data: { driverId: string; status: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit('driver:status_changed', {
      driverId: data.driverId,
      status: data.status,
      timestamp: new Date(),
    });
  }
}