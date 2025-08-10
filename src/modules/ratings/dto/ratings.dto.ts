import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateRatingDto {
  @IsNotEmpty()
  @IsUUID()
  rideId: string;

  @IsNotEmpty()
  @IsUUID()
  ratedById: string;

  @IsNotEmpty()
  @IsUUID()
  ratedUserId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1.0)
  @Max(5.0)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];
}

export class RatingFilterDto {
  @IsOptional()
  @IsUUID()
  rideId?: string;

  @IsOptional()
  @IsUUID()
  ratedById?: string;

  @IsOptional()
  @IsUUID()
  ratedUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1.0)
  @Max(5.0)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1.0)
  @Max(5.0)
  maxRating?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      return upperValue === 'ASC' || upperValue === 'DESC' ? upperValue : 'DESC';
    }
    return 'DESC';
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class RatingResponseDto {
  id: string;
  rideId: string;
  ratedById: string;
  ratedUserId: string;
  rating: number;
  review?: string;
  tags?: string[];
  createdAt: Date;

  // Optional relations data
  ratedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  ratedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  ride?: {
    id: string;
    pickupLocation: string;
    destinationLocation: string;
  };
}

export class RatingStatsDto {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    [key: string]: number; // '1': 5, '2': 3, '3': 10, etc.
  };
  topTags: {
    tag: string;
    count: number;
  }[];
}

export class UserAverageRatingDto {
  userId: string;
  averageRating: number;
  totalRatings: number;
  recentRatings: RatingResponseDto[];
}

export class RatingHistoryResponseDto {
  ratings: RatingResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating: number;
}

export class DriverRatingStatsDto extends RatingStatsDto {
  userId: string;
  monthlyStats: {
    month: string;
    averageRating: number;
    totalRatings: number;
  }[];
  recentReviews: {
    rating: number;
    review: string;
    ratedBy: string;
    createdAt: Date;
  }[];
}
