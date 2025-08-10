import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RouteResult, Coordinates } from '../interfaces/location.interfaces';

// Define interfaces for OpenRouteService API responses
interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  type: number;
}

interface RouteSegment {
  steps?: RouteStep[];
}

interface RouteSummary {
  distance: number;
  duration: number;
}

interface RouteGeometry {
  coordinates: number[][];
}

interface Route {
  summary: RouteSummary;
  geometry: RouteGeometry;
  segments: RouteSegment[];
}

interface RouteResponse {
  routes: Route[];
}

interface MatrixResponse {
  distances: number[][];
  durations: number[][];
}

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

      this.logger.debug('Getting route', { profile, requestBody });

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.openRouteServiceUrl}/v2/directions/${profile}/json`,
          requestBody,
          {
            headers: {
              Authorization: this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const routeData = response.data as RouteResponse;
      const route = routeData.routes[0];

      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry.coordinates,
        instructions:
          route.segments[0].steps?.map((step: RouteStep) => ({
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
          })) ?? [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown routing error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Routing error: ${errorMessage}`, errorStack);
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
        this.httpService.post(`${this.openRouteServiceUrl}/v2/matrix/${profile}`, requestBody, {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      const matrixData = response.data as MatrixResponse;

      return {
        distances: matrixData.distances,
        durations: matrixData.durations,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown matrix routing error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Matrix routing error: ${errorMessage}`, errorStack);
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
              Authorization: this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const routeData = response.data as RouteResponse;
      const route = routeData.routes[0];

      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry.coordinates,
        instructions: route.segments.flatMap(
          (segment: RouteSegment) =>
            segment.steps?.map((step: RouteStep) => ({
              instruction: step.instruction,
              distance: step.distance,
              duration: step.duration,
              type: step.type,
            })) ?? [],
        ),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown optimized routing error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Optimized routing error: ${errorMessage}`, errorStack);
      throw new Error('Optimized routing service unavailable');
    }
  }
}
