import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle])
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService], // Export service for use in other modules
})
export class VehiclesModule {}