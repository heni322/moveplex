import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';
import { VehicleType } from '../../database/entities/vehicle-type.entity';
import { VehicleTypeModule } from '../vehicle-types/vehicle-type.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleType]),
    // VehicleTypeModule
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
