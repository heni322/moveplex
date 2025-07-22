import { Logger, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { JwtAuthGuard } from "src/modules/auth/jwt-auth.guard";
import { LocationsService } from "src/modules/locations/services/locations.service";
import { Server, Socket } from 'socket.io';


@WebSocketGateway({
  namespace: 'ride-progress',
  cors: { origin: '*' },
})
export class RideProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RideProgressGateway.name);
  private activeRides = new Map<string, { riderId: string; driverId: string }>();

  constructor(private readonly locationsService: LocationsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to ride progress: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from ride progress: ${client.id}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('ride:join')
  async handleJoinRide(
    @MessageBody() data: { rideId: string; userId: string; userType: 'rider' | 'driver' },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`ride:${data.rideId}`);
    this.logger.log(`User ${data.userId} joined ride ${data.rideId} tracking`);
  }

  @SubscribeMessage('ride:status_update')
  async handleRideStatusUpdate(
    @MessageBody() data: {
      rideId: string;
      status: 'accepted' | 'driver_arriving' | 'in_progress' | 'completed';
      location?: { lat: number; lng: number };
      estimatedArrival?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(`ride:${data.rideId}`).emit('ride:status_changed', {
      rideId: data.rideId,
      status: data.status,
      location: data.location,
      estimatedArrival: data.estimatedArrival,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('ride:location_update')
  async handleRideLocationUpdate(
    @MessageBody() data: {
      rideId: string;
      driverId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Save tracking point
      await this.locationsService.addRideTrackingPoint(
        data.rideId,
        { latitude: data.latitude, longitude: data.longitude },
        data.speed,
        data.heading,
      );

      // Broadcast to ride participants
      this.server.to(`ride:${data.rideId}`).emit('ride:driver_location', {
        rideId: data.rideId,
        location: {
          lat: data.latitude,
          lng: data.longitude,
        },
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Error updating ride location: ${error.message}`);
    }
  }

  @SubscribeMessage('ride:driver_arrived')
  async handleDriverArrived(
    @MessageBody() data: { rideId: string; driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(`ride:${data.rideId}`).emit('ride:driver_arrived', {
      rideId: data.rideId,
      driverId: data.driverId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('ride:started')
  async handleRideStarted(
    @MessageBody() data: { rideId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(`ride:${data.rideId}`).emit('ride:started', {
      rideId: data.rideId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('ride:completed')
  async handleRideCompleted(
    @MessageBody() data: { rideId: string; fareAmount: number; distance: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(`ride:${data.rideId}`).emit('ride:completed', {
      rideId: data.rideId,
      fareAmount: data.fareAmount,
      distance: data.distance,
      timestamp: new Date(),
    });
  }
}