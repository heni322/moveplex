import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideRequest } from 'src/database/entities/ride-request.entity';
import { User } from 'src/database/entities/user.entity';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';
import { LocationsModule } from '../locations/locations.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      RideRequest,
      User,
      DriverProfile,
    ]),
    LocationsModule
  ],
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
  exports: [RideRequestsService],
})
export class RideRequestsModule {}