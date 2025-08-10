import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDecimal,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RideStatus, RideType } from '../../../database/entities/ride.entity';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class CreateRideDto {
  @IsUUID()
  riderId: string;

  @IsLatitude()
  @Type(() => Number)
  pickupLatitude: number;

  @IsLongitude()
  @Type(() => Number)
  pickupLongitude: number;

  @IsString()
  pickupAddress: string;

  @IsLatitude()
  @Type(() => Number)
  destinationLatitude: number;

  @IsLongitude()
  @Type(() => Number)
  destinationLongitude: number;

  @IsString()
  destinationAddress: string;

  @IsEnum(RideType)
  rideType: RideType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  fareAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  durationMinutes?: number;
}

export class AcceptRideDto {
  @IsUUID()
  driverId: string;
}

export class UpdateRideStatusDto {
  @IsEnum(RideStatus)
  status: RideStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RideFilterDto {
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;

  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'requestedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class NearbyRidesDto {
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number = 10;

  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;
}

export class RideResponseDto {
  id: string;
  riderId: string;
  driverId?: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  rideType: RideType;
  status: RideStatus;
  fareAmount?: number;
  distanceKm?: number;
  durationMinutes?: number;
  paymentStatus: PaymentStatus;
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rider?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    // rating: number;
  };
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    // rating: number;
    // vehicle?: {
    //   make: string;
    //   model: string;
    //   licensePlate: string;
    //   color: string;
    // };
  };
}

export class PaginatedRidesResponseDto {
  rides: RideResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RideStatsDto {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalEarnings: number;
  averageRating: number;
  totalDistance: number;
  totalDuration: number;
}
