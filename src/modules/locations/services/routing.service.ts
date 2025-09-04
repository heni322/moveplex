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
  way_points?: number[]; // Add way_points to get coordinate indices
}

interface RouteSegment {
  steps?: RouteStep[];
}

interface RouteSummary {
  distance: number;
  duration: number;
}

interface RouteGeometry {
  coordinates?: number[][]; // For GeoJSON format
  type?: string;
}

interface Route {
  summary: RouteSummary;
  geometry: RouteGeometry | string; // Can be encoded polyline or GeoJSON
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
    const configUrl = this.configService.get<string>('OPENROUTE_SERVICE_URL');
    this.openRouteServiceUrl = configUrl && configUrl.trim() !== '' 
      ? configUrl 
      : 'https://api.openrouteservice.org';
    
    const configApiKey = this.configService.get<string>('ORS_API_KEY');
    this.apiKey = configApiKey && configApiKey.trim() !== '' ? configApiKey : '';
    
    this.logger.debug('RoutingService initialized', { 
      baseUrl: this.openRouteServiceUrl, 
      hasApiKey: !!this.apiKey 
    });
  }

  async getRoute(
    start: Coordinates,
    end: Coordinates,
    profile: string = 'driving-car',
    waypoints?: Coordinates[],
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

      const coordinates = [
        [start.longitude, start.latitude],
        ...(waypoints?.map(wp => [wp.longitude, wp.latitude]) || []),
        [end.longitude, end.latitude],
      ];

      const requestBody = {
        coordinates,
        instructions: true,
        geometry: true, // Boolean: true to include geometry, false to exclude
      };
      
      this.logger.debug('Getting route', { profile, requestBody });
      
      const url = `${this.openRouteServiceUrl}/v2/directions/${profile}`;
      
      this.logger.debug('Making route request', { 
        url, 
        profile, 
        requestBody,
        hasApiKey: !!this.apiKey 
      });

      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }),
      );

      const routeData = response.data as RouteResponse;
        
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error('No routes found');
      }
      
      const route = routeData.routes[0];
      
      // Handle geometry - check if it's GeoJSON or encoded polyline
      let geometry: number[][];
      if (typeof route.geometry === 'string') {
        // It's an encoded polyline, decode it
        geometry = this.decodePolyline(route.geometry);
      } else if (route.geometry && route.geometry.coordinates) {
        // It's GeoJSON format
        geometry = route.geometry.coordinates;
      } else {
        throw new Error('Invalid geometry format in response');
      }


      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        coordinates: geometry,
        instructions:
          route.segments[0]?.steps?.map((step: RouteStep, index: number) => ({
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
            coordinates: this.getStepCoordinates(step, geometry, index),
          })) ?? [],
      };
    } catch (error) {
      if (error.response) {
        this.logger.error('API Response Error', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
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
        instructions: true,
        geometry: true, // Boolean: true to include geometry, false to exclude
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
      
      let geometry: number[][];
      if (typeof route.geometry === 'string') {
        geometry = this.decodePolyline(route.geometry);
      } else if (route.geometry && route.geometry.coordinates) {
        geometry = route.geometry.coordinates;
      } else {
        throw new Error('Invalid geometry format in response');
      }

      return {
        distance: route.summary.distance,
        duration: route.summary.duration,
        coordinates: geometry,
        instructions: route.segments.flatMap(
          (segment: RouteSegment) =>
            segment.steps?.map((step: RouteStep, index: number) => ({
              instruction: step.instruction,
              distance: step.distance,
              duration: step.duration,
              type: step.type,
              coordinates: this.getStepCoordinates(step, geometry, index),
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

  private getStepCoordinates(step: RouteStep, geometry: number[][], stepIndex: number): Coordinates {
    // Ensure geometry exists and has coordinates
    if (!geometry || geometry.length === 0) {
      return { longitude: 0, latitude: 0 };
    }

    const coordIndex = Math.min(stepIndex, geometry.length - 1);
    const coord = geometry[coordIndex];
    
    if (coord && coord.length >= 2) {
      return {
        longitude: coord[0],
        latitude: coord[1],
      };
    }

    // Fallback: use first coordinate
    const firstCoord = geometry[0];
    if (firstCoord && firstCoord.length >= 2) {
      return {
        longitude: firstCoord[0],
        latitude: firstCoord[1],
      };
    }

    return { longitude: 0, latitude: 0 };
  }

  // Simple polyline decoder (Google's polyline algorithm)
  private decodePolyline(encoded: string): number[][] {
    const coordinates: number[][] = [];
    let lat = 0;
    let lng = 0;
    let index = 0;

    while (index < encoded.length) {
      // Decode latitude
      let shift = 0;
      let result = 0;
      let byte: number;
      
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      
      const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      // Decode longitude
      shift = 0;
      result = 0;
      
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      
      const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push([lng / 1e5, lat / 1e5]);
    }

    return coordinates;
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