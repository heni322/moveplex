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
    // Handle empty or undefined environment variable properly
    const configUrl = this.configService.get<string>('OPENROUTE_SERVICE_URL');
    this.openRouteServiceUrl = configUrl && configUrl.trim() !== '' 
      ? configUrl 
      : 'https://api.openrouteservice.org';
    
    // Handle API key similarly
    const configApiKey = this.configService.get<string>('ORS_API_KEY');
    this.apiKey = configApiKey && configApiKey.trim() !== '' ? configApiKey : '';
    
    // Log initialization info for debugging
    this.logger.debug('RoutingService initialized', { 
      baseUrl: this.openRouteServiceUrl, 
      hasApiKey: !!this.apiKey 
    });
  }

  async getRoute(
    start: Coordinates,
    end: Coordinates,
    profile: string = 'driving-car',
  ): Promise<RouteResult> {
    try {
      if (!this.isValidCoordinate(start) || !this.isValidCoordinate(end)) {
        throw new Error('Invalid coordinates provided');
      }

      const validProfiles = [
        'driving-car', 'driving-hgv', 'cycling-regular', 
        'cycling-road', 'cycling-mountain', 'cycling-electric',
        'foot-walking', 'foot-hiking', 'wheelchair'
      ];
      
      if (!validProfiles.includes(profile)) {
        throw new Error(`Invalid profile: ${profile}`);
      }

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
      
      // Construct full URL properly
      const url = `${this.openRouteServiceUrl}/v2/directions/${profile}`;
      
      this.logger.debug('Making route request', { 
        url, 
        profile, 
        requestBody,
        hasApiKey: !!this.apiKey 
      });

      // Make the request with proper headers
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          headers: {
            'Authorization': this.apiKey, // Remove Bearer prefix as ORS expects just the key
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000, // Add timeout
        }),
      );

      const routeData = response.data as RouteResponse;
      
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error('No routes found');
      }
      
      const route = routeData.routes[0];

      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        geometry: route.geometry.coordinates,
        instructions:
          route.segments[0]?.steps?.map((step: RouteStep) => ({
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
          })) ?? [],
      };
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        this.logger.error('API Response Error', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
        // The request was made but no response was received
        this.logger.error('Network Error', { 
          message: error.message,
          code: error.code,
          url: this.openRouteServiceUrl
        });
      } else {
        this.logger.error('Request Setup Error', { message: error.message });
      }
      throw new Error(`Routing service unavailable: ${error.message}`);
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

      const url = `${this.openRouteServiceUrl}/v2/matrix/${profile}`;
      
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
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

      const url = `${this.openRouteServiceUrl}/v2/directions/${profile}`;
      
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
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

  private isValidCoordinate(coord: Coordinates): boolean {
    return (
      coord &&
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180
    );
  }
}