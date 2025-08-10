import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { LocationsController } from './locations.controller';
import { LocationsService } from './services/locations.service';
import { GeocodingService } from './services/geocoding.service';
import { RoutingService } from './services/routing.service';
import { PostgisService } from './services/postgis.service';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';
import { RideTracking } from 'src/database/entities/ride-tracking.entity';
import { SurgePricing } from 'src/database/entities/surge-pricing.entity';
import { Ride } from 'src/database/entities/ride.entity';
import { DriverLocationGateway } from './gateways/driver-location.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverProfile, Ride, RideTracking, SurgePricing]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [LocationsController],
  providers: [
    LocationsService,
    GeocodingService,
    RoutingService,
    PostgisService,
    DriverLocationGateway,
  ],
  exports: [LocationsService, GeocodingService, RoutingService, PostgisService],
})
export class LocationsModule {}
