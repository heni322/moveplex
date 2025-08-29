import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleType } from '../../database/entities/vehicle-type.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { VehicleTypeController } from './vehicle-type.controller';
import { VehicleTypeService } from './vehicle-type.service';
import { FileUploadService } from '../../common/services/file-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleType, Vehicle])],
  controllers: [VehicleTypeController],
  providers: [VehicleTypeService, FileUploadService],
  exports: [VehicleTypeService], // Export for use in other modules
})
export class VehicleTypeModule {}