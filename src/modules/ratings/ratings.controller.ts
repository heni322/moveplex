import { Controller, Get, Post, Body, Param, Query, ValidationPipe } from '@nestjs/common';
import { CreateRatingDto, RatingFilterDto } from './dto/ratings.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  async createRating(@Body(ValidationPipe) createDto: CreateRatingDto) {
    return this.ratingsService.createRating(createDto);
  }

  @Get(':ratingId')
  async getRating(@Param('ratingId') ratingId: string) {
    return this.ratingsService.getRating(ratingId);
  }

  @Get()
  async getRatings(@Query(ValidationPipe) filterDto: RatingFilterDto) {
    return this.ratingsService.getRatings(filterDto);
  }

  @Get('ride/:rideId')
  async getRideRatings(@Param('rideId') rideId: string) {
    return this.ratingsService.getRideRatings(rideId);
  }

  @Get('user/:userId/received')
  async getUserRatingsReceived(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ratingsService.getUserRatingsReceived(userId, page, limit);
  }

  @Get('user/:userId/given')
  async getUserRatingsGiven(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ratingsService.getUserRatingsGiven(userId, page, limit);
  }

  @Get('user/:userId/average')
  async getUserAverageRating(@Param('userId') userId: string) {
    return this.ratingsService.getUserAverageRating(userId);
  }

  @Get('driver/:driverId/stats')
  async getDriverRatingStats(@Param('driverId') driverId: string) {
    return this.ratingsService.getDriverRatingStats(driverId);
  }
}
