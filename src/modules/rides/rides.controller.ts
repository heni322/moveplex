import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import {
  CreateRideDto,
  AcceptRideDto,
  UpdateRideStatusDto,
  RideFilterDto,
  NearbyRidesDto,
  RideResponseDto,
  PaginatedRidesResponseDto,
  RideStatsDto,
} from './dto/rides.dto';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createRide(@Body() createDto: CreateRideDto): Promise<RideResponseDto> {
    return this.ridesService.createRide(createDto);
  }

  @Get('nearby')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getNearbyRides(@Query() nearbyDto: NearbyRidesDto): Promise<RideResponseDto[]> {
    return this.ridesService.getNearbyRides(nearbyDto);
  }

  @Get(':rideId')
  async getRide(@Param('rideId') rideId: string): Promise<RideResponseDto> {
    return this.ridesService.getRide(rideId);
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getRides(@Query() filterDto: RideFilterDto): Promise<PaginatedRidesResponseDto> {
    return this.ridesService.getRides(filterDto);
  }

  @Put(':rideId/accept')
  @UsePipes(new ValidationPipe({ transform: true }))
  async acceptRide(
    @Param('rideId') rideId: string,
    @Body() acceptDto: AcceptRideDto,
  ): Promise<RideResponseDto> {
    return this.ridesService.acceptRide(rideId, acceptDto.driverId);
  }

  @Put(':rideId/start')
  async startRide(@Param('rideId') rideId: string): Promise<RideResponseDto> {
    return this.ridesService.startRide(rideId);
  }

  @Put(':rideId/complete')
  async completeRide(@Param('rideId') rideId: string): Promise<RideResponseDto> {
    return this.ridesService.completeRide(rideId);
  }

  @Put(':rideId/cancel')
  async cancelRide(
    @Param('rideId') rideId: string,
    @Body('reason') reason?: string,
  ): Promise<RideResponseDto> {
    return this.ridesService.cancelRide(rideId, reason);
  }

  @Put(':rideId/status')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateRideStatus(
    @Param('rideId') rideId: string,
    @Body() statusDto: UpdateRideStatusDto,
  ): Promise<RideResponseDto> {
    return this.ridesService.updateRideStatus(rideId, statusDto.status);
  }

  @Get(':rideId/tracking')
  async getRideTracking(@Param('rideId') rideId: string) {
    return this.ridesService.getRideTracking(rideId);
  }

  @Get('rider/:riderId/history')
  async getRiderHistory(
    @Param('riderId') riderId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedRidesResponseDto> {
    return this.ridesService.getRiderHistory(riderId, page, limit);
  }

  @Get('driver/:driverId/history')
  async getDriverHistory(
    @Param('driverId') driverId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedRidesResponseDto> {
    return this.ridesService.getDriverHistory(driverId, page, limit);
  }

  @Get('rider/:riderId/stats')
  async getRiderStats(@Param('riderId') riderId: string): Promise<RideStatsDto> {
    return this.ridesService.getRideStats(riderId, false);
  }

  @Get('driver/:driverId/stats')
  async getDriverStats(@Param('driverId') driverId: string): Promise<RideStatsDto> {
    return this.ridesService.getRideStats(driverId, true);
  }
}