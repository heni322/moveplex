import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';
import { User } from 'src/database/entities/user.entity';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { DriverProfileController } from './driver-profiles.controller';
import { DriverProfileService } from './driver-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverProfile, User, Vehicle])],
  controllers: [DriverProfileController],
  providers: [DriverProfileService],
  exports: [DriverProfileService],
})
export class DriverProfileModule {}
