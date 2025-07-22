import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsBoolean,
  Min, 
  Max, 
  Length,
  Matches 
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VehicleType } from 'src/database/entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString()
  @Length(1, 50)
  make: string;

  @IsString()
  @Length(1, 50)
  model: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsString()
  @Length(1, 30)
  color: string;

  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Z0-9\-\s]+$/i, {
    message: 'License plate must contain only letters, numbers, hyphens, and spaces'
  })
  licensePlate: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  seats?: number = 4;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Z0-9\-\s]+$/i, {
    message: 'License plate must contain only letters, numbers, hyphens, and spaces'
  })
  licensePlate?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  seats?: number;
}

export class VehicleFilterDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(8)
  seats?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isVerified?: boolean;

  // Pagination
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Sorting
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @Matches(/^(ASC|DESC)$/i)
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}