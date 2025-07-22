import { Injectable, Logger } from '@nestjs/common';
import { PostgisService } from './postgis.service';
import { GeocodingService } from './geocoding.service';
import { RoutingService } from './routing.service';
import { Coordinates, GeocodeResult, NearbyDriver, RouteResult, SurgeArea } from '../interfaces/location.interfaces';


@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private readonly postgisService: PostgisService,
    private readonly geocodingService: GeocodingService,
    private readonly routingService: RoutingService,
  ) {}

  async findNearbyDrivers(
    coordinates: Coordinates,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<NearbyDriver[]> {
    return this.postgisService.findNearbyDrivers(coordinates, radiusKm, limit);
  }

  async updateDriverLocation(
    driverId: string,
    coordinates: Coordinates,
  ): Promise<void> {
    await this.postgisService.updateDriverLocation(driverId, coordinates);
    this.logger.debug(`Updated location for driver ${driverId}`);
  }

  async geocodeAddress(
    query: string,
    limit: number = 5,
    countryCode?: string,
  ): Promise<GeocodeResult[]> {
    return this.geocodingService.geocode(query, limit, countryCode);
  }

  async reverseGeocodeLocation(
    coordinates: Coordinates,
  ): Promise<GeocodeResult | null> {
    return this.geocodingService.reverseGeocode(
      coordinates.latitude,
      coordinates.longitude,
    );
  }

  async calculateRoute(
    start: Coordinates,
    end: Coordinates,
    profile: string = 'driving-car',
  ): Promise<RouteResult> {
    return this.routingService.getRoute(start, end, profile);
  }

  async calculateFareEstimate(
    start: Coordinates,
    end: Coordinates,
    vehicleType: string = 'economy',
  ): Promise<{
    basefare: number;
    surgeMultiplier: number;
    estimatedFare: number;
    distance: number;
    duration: number;
  }> {
    // Get route information
    const route = await this.routingService.getRoute(start, end);
    
    // Get surge multiplier for pickup location
    const surgeMultiplier = await this.postgisService.getSurgeMultiplier(start);
    
    // Base fare calculation (customize based on your business logic)
    const baseFareRates = {
      economy: { base: 2.5, perKm: 1.2, perMinute: 0.25 },
      premium: { base: 3.5, perKm: 1.8, perMinute: 0.35 },
      luxury: { base: 5.0, perKm: 2.5, perMinute: 0.5 },
      suv: { base: 4.0, perKm: 2.0, perMinute: 0.4 },
    };
    
    const rates = baseFareRates[vehicleType] || baseFareRates.economy;
    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;
    
    const basefare = rates.base + (distanceKm * rates.perKm) + (durationMinutes * rates.perMinute);
    const estimatedFare = basefare * surgeMultiplier;
    
    return {
      basefare,
      surgeMultiplier,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      distance: distanceKm,
      duration: durationMinutes,
    };
  }

  async addRideTrackingPoint(
    rideId: string,
    coordinates: Coordinates,
    speed?: number,
    heading?: number,
  ): Promise<void> {
    await this.postgisService.addRideTrackingPoint(
      rideId,
      coordinates,
      speed,
      heading,
    );
  }

  async getActiveSurgeAreas(): Promise<SurgeArea[]> {
    return this.postgisService.getActiveSurgeAreas();
  }

  async calculateDistance(
    point1: Coordinates,
    point2: Coordinates,
  ): Promise<number> {
    return this.postgisService.calculateDistance(point1, point2);
  }
}