import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DriverStatus } from '../../../database/entities/driver-profile.entity';

export class CreateDriverProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  licenseNumber: string;

  @IsDateString()
  licenseExpiry: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  currentLongitude?: number;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  currentLongitude?: number;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  totalRides?: number;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  @IsNotEmpty()
  status: DriverStatus;
}

export class UpdateDriverLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }: { value: string | number }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  longitude: number;
}

export class AssignVehicleDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;
}

// Response DTOs
export class DriverProfileResponseDto {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleId?: string;
  isOnline: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  rating: number;
  totalRides: number;
  status: DriverStatus;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
  };
}

export class DriverStatsResponseDto {
  driverId: string;
  totalRides: number;
  rating: number;
  isOnline: boolean;
  status: DriverStatus;
  totalEarnings?: number;
  completedRides?: number;
  cancelledRides?: number;
  averageRideTime?: number;
  joinDate: Date;
}
