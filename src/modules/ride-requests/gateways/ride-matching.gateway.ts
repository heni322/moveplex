import { Logger, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { LocationsService } from "src/modules/locations/services/locations.service";

@WebSocketGateway({
  namespace: 'ride-matching',
  cors: { origin: '*' },
})
export class RideMatchingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RideMatchingGateway.name);
  private connectedUsers = new Map<string, { userId: string; userType: string }>();

  constructor(private readonly locationsService: LocationsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to ride matching: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.connectedUsers.delete(client.id);
      this.logger.log(`User ${user.userId} disconnected from ride matching`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('user:connect')
  async handleUserConnect(
    @MessageBody() data: { userId: string; userType: 'rider' | 'driver' },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(client.id, data);
    client.join(`user:${data.userId}`);
    
    if (data.userType === 'driver') {
      client.join('drivers');
    } else {
      client.join('riders');
    }
    
    this.logger.log(`User ${data.userId} (${data.userType}) connected to ride matching`);
  }

  @SubscribeMessage('ride:request')
  async handleRideRequest(
    @MessageBody() data: {
      riderId: string;
      pickupLat: number;
      pickupLng: number;
      destLat: number;
      destLng: number;
      rideType: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Find nearby drivers
      const nearbyDrivers = await this.locationsService.findNearbyDrivers(
        { latitude: data.pickupLat, longitude: data.pickupLng },
        10, // 10km radius
        20, // max 20 drivers
      );

      // Send ride request to nearby drivers
      nearbyDrivers.forEach(driver => {
        this.server.to(`user:${driver.userId}`).emit('ride:request_received', {
          rideId: data.riderId, // You'll need to generate actual ride ID
          riderId: data.riderId,
          pickupLocation: { lat: data.pickupLat, lng: data.pickupLng },
          destination: { lat: data.destLat, lng: data.destLng },
          rideType: data.rideType,
          estimatedDistance: driver.distanceKm,
          timestamp: new Date(),
        });
      });

      client.emit('ride:request_sent', {
        success: true,
        driversNotified: nearbyDrivers.length,
      });

    } catch (error) {
      client.emit('ride:request_sent', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('ride:accept')
  async handleRideAccept(
    @MessageBody() data: { rideId: string; driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Notify rider that ride was accepted
    this.server.emit('ride:accepted', {
      rideId: data.rideId,
      driverId: data.driverId,
      timestamp: new Date(),
    });

    // Notify other drivers that ride is no longer available
    this.server.to('drivers').emit('ride:no_longer_available', {
      rideId: data.rideId,
    });

    client.emit('ride:accept_confirmed', { success: true });
  }

  @SubscribeMessage('ride:decline')
  async handleRideDecline(
    @MessageBody() data: { rideId: string; driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit('ride:driver_declined', {
      rideId: data.rideId,
      driverId: data.driverId,
    });
  }

  @SubscribeMessage('ride:cancel')
  async handleRideCancel(
    @MessageBody() data: { rideId: string; userId: string; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit('ride:cancelled', {
      rideId: data.rideId,
      cancelledBy: data.userId,
      reason: data.reason,
      timestamp: new Date(),
    });
  }
}
