import { Controller, Get, Post, Put, Body, Param, ValidationPipe } from '@nestjs/common';
import {
  CreateDriverProfileDto,
  UpdateDriverProfileDto,
  UpdateDriverStatusDto,
} from './dto/driver-profile.dto';
import { DriverProfileService } from './driver-profiles.service';

@Controller('driver-profiles')
export class DriverProfileController {
  constructor(private readonly driverProfileService: DriverProfileService) {}

  @Post('profile')
  async createDriverProfile(@Body(ValidationPipe) createDto: CreateDriverProfileDto) {
    return this.driverProfileService.createDriverProfile(createDto);
  }

  @Get(':driverId/profile')
  async getDriverProfile(@Param('driverId') driverId: string) {
    return this.driverProfileService.getDriverProfile(driverId);
  }

  @Put(':driverId/profile')
  async updateDriverProfile(
    @Param('driverId') driverId: string,
    @Body(ValidationPipe) updateDto: UpdateDriverProfileDto,
  ) {
    return this.driverProfileService.updateDriverProfile(driverId, updateDto);
  }

  @Put(':driverId/status')
  async updateDriverStatus(
    @Param('driverId') driverId: string,
    @Body(ValidationPipe) statusDto: UpdateDriverStatusDto,
  ) {
    return this.driverProfileService.updateDriverStatus(driverId, statusDto.status);
  }

  @Put(':driverId/online')
  async goOnline(@Param('driverId') driverId: string) {
    return this.driverProfileService.setDriverOnline(driverId, true);
  }

  @Put(':driverId/offline')
  async goOffline(@Param('driverId') driverId: string) {
    return this.driverProfileService.setDriverOnline(driverId, false);
  }

  @Get(':driverId/stats')
  async getDriverStats(@Param('driverId') driverId: string) {
    return this.driverProfileService.getDriverStats(driverId);
  }

  @Put(':driverId/vehicle')
  async assignVehicle(@Param('driverId') driverId: string, @Body('vehicleId') vehicleId: string) {
    return this.driverProfileService.assignVehicle(driverId, vehicleId);
  }
}
