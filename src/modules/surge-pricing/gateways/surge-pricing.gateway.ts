import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationsService } from '../../../modules/locations/services/locations.service';

@WebSocketGateway({
  namespace: 'surge-pricing',
  cors: { origin: '*' },
})
export class SurgePricingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SurgePricingGateway.name);

  constructor(private readonly locationsService: LocationsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to surge pricing: ${client.id}`);

    // Send current surge areas on connection
    try {
      const surgeAreas = await this.locationsService.getActiveSurgeAreas();
      client.emit('surge:current_areas', surgeAreas);
    } catch (error) {
      this.logger.error(`Error fetching surge areas: ${error.message}`);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from surge pricing: ${client.id}`);
  }

  @SubscribeMessage('surge:subscribe_area')
  async handleSubscribeToArea(
    @MessageBody() data: { areaId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`surge:${data.areaId}`);
    this.logger.log(`Client subscribed to surge area: ${data.areaId}`);
  }

  async broadcastSurgeUpdate(surgeArea: {
    id: string;
    areaName: string;
    multiplier: number;
    isActive: boolean;
  }) {
    this.server.emit('surge:area_updated', {
      ...surgeArea,
      timestamp: new Date(),
    });

    // Also send to specific area subscribers
    this.server.to(`surge:${surgeArea.id}`).emit('surge:multiplier_changed', {
      areaId: surgeArea.id,
      multiplier: surgeArea.multiplier,
      isActive: surgeArea.isActive,
      timestamp: new Date(),
    });
  }

  async broadcastSurgeAreaCreated(surgeArea: any) {
    this.server.emit('surge:area_created', {
      ...surgeArea,
      timestamp: new Date(),
    });
  }

  async broadcastSurgeAreaDeactivated(areaId: string) {
    this.server.emit('surge:area_deactivated', {
      areaId,
      timestamp: new Date(),
    });
  }
}
