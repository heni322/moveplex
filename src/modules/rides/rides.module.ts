import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { Ride } from 'src/database/entities/ride.entity';
import { User } from '../../database/entities/user.entity';
import { RideTracking } from 'src/database/entities/ride-tracking.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { RatingReview } from 'src/database/entities/rating-review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ride, User, RideTracking, Payment, RatingReview])],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
