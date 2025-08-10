import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto } from './dto/vehicles.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  async createVehicle(@Body(ValidationPipe) createDto: CreateVehicleDto) {
    return this.vehiclesService.createVehicle(createDto);
  }

  @Get(':vehicleId')
  async getVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehiclesService.getVehicle(vehicleId);
  }

  @Get()
  async getVehicles(@Query(ValidationPipe) filterDto: VehicleFilterDto) {
    return this.vehiclesService.getVehicles(filterDto);
  }

  @Put(':vehicleId')
  async updateVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body(ValidationPipe) updateDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.updateVehicle(vehicleId, updateDto);
  }

  @Delete(':vehicleId')
  async deleteVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehiclesService.deleteVehicle(vehicleId);
  }

  @Put(':vehicleId/verify')
  async verifyVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehiclesService.verifyVehicle(vehicleId);
  }

  @Get('license-plate/:licensePlate')
  async getVehicleByLicensePlate(@Param('licensePlate') licensePlate: string) {
    return this.vehiclesService.getVehicleByLicensePlate(licensePlate);
  }
}
