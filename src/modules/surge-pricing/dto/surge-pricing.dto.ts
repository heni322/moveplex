import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateSurgePricingDto {
  @IsString()
  areaName: string;

  @IsArray()
  @ArrayMinSize(4) // Minimum 4 points for a polygon (with closing point)
  @ValidateNested({ each: true })
  @Type(() => Array)
  coordinates: number[][];

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  multiplier: number;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    reason?: string;
    demandLevel?: number;
    availableDrivers?: number;
  };
}

export class UpdateSurgePricingDto {
  @IsOptional()
  @IsString()
  areaName?: string;


  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ValidateNested({ each: true })
  @Type(() => Array)
  coordinates?: number[][];

  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  multiplier?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    reason?: string;
    demandLevel?: number;
    availableDrivers?: number;
  };
}

export class SurgePricingFilterDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  areaName?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(1.0)
  minMultiplier?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Max(5.0)
  maxMultiplier?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class LocationCheckDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class SurgePricingResponseDto {
  id: string;

  areaName: string;

  multiplier: number;

  isActive: boolean;

  startsAt: Date;

  endsAt?: Date;

  metadata?: {
    reason?: string;
    demandLevel?: number;
    availableDrivers?: number;
  };

  createdAt: Date;

  updatedAt: Date;
}

export class LocationSurgeResponseDto {
  inSurgeArea: boolean;

  multiplier: number;

  surgeAreas?: SurgePricingResponseDto[];
}