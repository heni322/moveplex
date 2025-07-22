import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CreateRideRequestDto, FindRideRequestsDto } from './dto/ride-requests.dto';
import { RideRequestsService } from './ride-requests.service';

@Controller('ride-requests')
export class RideRequestsController {
  constructor(private readonly rideRequestsService: RideRequestsService) {}

  @Post()
  async createRideRequest(@Body(ValidationPipe) createDto: CreateRideRequestDto) {
    return this.rideRequestsService.createRideRequest(createDto);
  }

  @Get(':requestId')
  async getRideRequest(@Param('requestId') requestId: string) {
    return this.rideRequestsService.getRideRequest(requestId);
  }

  @Get()
  async findRideRequests(@Query(ValidationPipe) filterDto: FindRideRequestsDto) {
    return this.rideRequestsService.findRideRequests(filterDto);
  }

  @Delete(':requestId')
  async cancelRideRequest(@Param('requestId') requestId: string) {
    return this.rideRequestsService.cancelRideRequest(requestId);
  }

  @Get('driver/:driverId/nearby')
  async getNearbyRequests(
    @Param('driverId') driverId: string,
    @Query('radiusKm') radiusKm: number = 5,
  ) {
    return this.rideRequestsService.getNearbyRequests(driverId, radiusKm);
  }
}
