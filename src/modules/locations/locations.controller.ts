import { Controller, Get, Post, Body, Query, Param, ValidationPipe } from '@nestjs/common';
import { LocationDto, FindNearbyDriversDto, GeocodeDto, RouteDto } from './dto/location.dto';
import { LocationsService } from './services/locations.service';
import {
  NearbyDriver,
  GeocodeResult,
  RouteResult,
  SurgeArea,
} from './interfaces/location.interfaces';

// Add the missing FareEstimate interface locally or add it to your interfaces file
interface FareEstimate {
  basefare: number;
  surgeMultiplier: number;
  estimatedFare: number;
  distance: number;
  duration: number;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('drivers/nearby')
  async findNearbyDrivers(
    @Query(ValidationPipe) query: FindNearbyDriversDto,
  ): Promise<NearbyDriver[]> {
    return this.locationsService.findNearbyDrivers(
      { latitude: query.latitude, longitude: query.longitude },
      query.radiusKm,
      query.limit,
    );
  }

  @Post('drivers/:driverId/location')
  async updateDriverLocation(
    @Param('driverId') driverId: string,
    @Body(ValidationPipe) location: LocationDto,
  ): Promise<{ success: boolean }> {
    await this.locationsService.updateDriverLocation(driverId, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return { success: true };
  }

  @Get('geocode')
  async geocode(@Query(ValidationPipe) query: GeocodeDto): Promise<GeocodeResult[]> {
    return this.locationsService.geocodeAddress(query.query, query.limit, query.countryCode);
  }

  @Post('reverse-geocode')
  async reverseGeocode(@Body(ValidationPipe) location: LocationDto): Promise<GeocodeResult | null> {
    return this.locationsService.reverseGeocodeLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  @Post('route')
  async calculateRoute(@Body(ValidationPipe) routeDto: RouteDto): Promise<RouteResult> {
    return this.locationsService.calculateRoute(
      {
        latitude: routeDto.startLatitude,
        longitude: routeDto.startLongitude,
      },
      {
        latitude: routeDto.endLatitude,
        longitude: routeDto.endLongitude,
      },
      routeDto.profile,
    );
  }

  @Post('fare-estimate')
  async calculateFareEstimate(
    @Body(ValidationPipe) body: RouteDto & { vehicleType?: string },
  ): Promise<FareEstimate> {
    return this.locationsService.calculateFareEstimate(
      {
        latitude: body.startLatitude,
        longitude: body.startLongitude,
      },
      {
        latitude: body.endLatitude,
        longitude: body.endLongitude,
      },
      body.vehicleType,
    );
  }

  @Post('rides/:rideId/tracking')
  async addTrackingPoint(
    @Param('rideId') rideId: string,
    @Body(ValidationPipe) body: LocationDto & { speed?: number; heading?: number },
  ): Promise<{ success: boolean }> {
    await this.locationsService.addRideTrackingPoint(
      rideId,
      { latitude: body.latitude, longitude: body.longitude },
      body.speed,
      body.heading,
    );
    return { success: true };
  }

  @Get('surge-areas')
  async getSurgeAreas(): Promise<SurgeArea[]> {
    return this.locationsService.getActiveSurgeAreas();
  }

  @Post('distance')
  async calculateDistance(
    @Body(ValidationPipe) body: { point1: LocationDto; point2: LocationDto },
  ): Promise<{ distanceKm: number }> {
    const distance = await this.locationsService.calculateDistance(
      {
        latitude: body.point1.latitude,
        longitude: body.point1.longitude,
      },
      {
        latitude: body.point2.latitude,
        longitude: body.point2.longitude,
      },
    );
    return { distanceKm: distance };
  }
}
