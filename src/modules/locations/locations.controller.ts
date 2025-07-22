import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import {
  LocationDto,
  FindNearbyDriversDto,
  GeocodeDto,
  RouteDto,
} from './dto/location.dto';
import { LocationsService } from './services/locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('drivers/nearby')
  async findNearbyDrivers(@Query(ValidationPipe) query: FindNearbyDriversDto) {
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
  ) {
    await this.locationsService.updateDriverLocation(driverId, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return { success: true };
  }

  @Get('geocode')
  async geocode(@Query(ValidationPipe) query: GeocodeDto) {
    return this.locationsService.geocodeAddress(
      query.query,
      query.limit,
      query.countryCode,
    );
  }

  @Post('reverse-geocode')
  async reverseGeocode(@Body(ValidationPipe) location: LocationDto) {
    return this.locationsService.reverseGeocodeLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  @Post('route')
  async calculateRoute(@Body(ValidationPipe) routeDto: RouteDto) {
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
  ) {
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
  ) {
    await this.locationsService.addRideTrackingPoint(
      rideId,
      { latitude: body.latitude, longitude: body.longitude },
      body.speed,
      body.heading,
    );
    return { success: true };
  }

  @Get('surge-areas')
  async getSurgeAreas() {
    return this.locationsService.getActiveSurgeAreas();
  }

  @Post('distance')
  async calculateDistance(
    @Body(ValidationPipe) body: {
      point1: LocationDto;
      point2: LocationDto;
    },
  ) {
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