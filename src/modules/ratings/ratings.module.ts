import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
import { RatingReview } from 'src/database/entities/rating-review.entity';
import { RatingsService } from './ratings.service';


@Module({
  imports: [TypeOrmModule.forFeature([RatingReview])],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService], // Export service for use in other modules
})
export class RatingsModule {}
