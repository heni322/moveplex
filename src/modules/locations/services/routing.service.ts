import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RouteResult, Coordinates } from '../interfaces/location.interfaces';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly openRouteServiceUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openRouteServiceUrl = this.configService.get(
      'OPENROUTE_SERVICE_URL',
      'http://37.59.98.144/ors',
    );
    this.apiKey = this.configService.get('ORS_API_KEY')!;
  }

  async getRoute(
    start: Coordinates,
    end: Coordinates,
    profile: string = 'driving-car',
  ): Promise<RouteResult> {
    try {
      const requestBody = {
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
        format: 'json',
        instructions: true,
        geometry: true,
      };
      console.log("profile", profile);
      console.log("apiKey", this.apiKey);
      console.log("requestBody", requestBody);
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.openRouteServiceUrl}/v2/directions/${profile}/json`,
          requestBody,
          {
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const route = response.data.routes[0];
      
      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry.coordinates,
        instructions: route.segments[0].steps?.map((step: any) => ({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
          type: step.type,
        })) || [],
      };
    } catch (error) {
      this.logger.error(`Routing error: ${error.message}`, error.stack);
      throw new Error('Routing service unavailable');
    }
  }

  async getMatrix(
    sources: Coordinates[],
    destinations: Coordinates[],
    profile: string = 'driving-car',
  ): Promise<{ distances: number[][]; durations: number[][] }> {
    try {
      const locations = [...sources, ...destinations];
      const sourceIndices = sources.map((_, index) => index);
      const destinationIndices = destinations.map((_, index) => sources.length + index);

      const requestBody = {
        locations: locations.map(coord => [coord.longitude, coord.latitude]),
        sources: sourceIndices,
        destinations: destinationIndices,
        metrics: ['distance', 'duration'],
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.openRouteServiceUrl}/v2/matrix/${profile}`,
          requestBody,
          {
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        distances: response.data.distances,
        durations: response.data.durations,
      };
    } catch (error) {
      this.logger.error(`Matrix routing error: ${error.message}`, error.stack);
      throw new Error('Matrix routing service unavailable');
    }
  }

  async getOptimizedRoute(
    waypoints: Coordinates[],
    profile: string = 'driving-car',
  ): Promise<RouteResult> {
    try {
      const requestBody = {
        coordinates: waypoints.map(coord => [coord.longitude, coord.latitude]),
        format: 'json',
        instructions: true,
        geometry: true,
        optimize: true,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.openRouteServiceUrl}/v2/directions/${profile}/json`,
          requestBody,
          {
            headers: {
              'Authorization': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const route = response.data.routes[0];
      
      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry.coordinates,
        instructions: route.segments.flatMap((segment: any) => 
          segment.steps?.map((step: any) => ({
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
          })) || []
        ),
      };
    } catch (error) {
      this.logger.error(`Optimized routing error: ${error.message}`, error.stack);
      throw new Error('Optimized routing service unavailable');
    }
  }
}
