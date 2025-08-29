import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  Length,
  Matches,
  ArrayNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Make of the vehicle',
    example: 'Toyota',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  make: string;

  @ApiProperty({
    description: 'Model of the vehicle',
    example: 'Camry',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  model: string;

  @ApiProperty({
    description: 'Year of the vehicle',
    example: 2022,
    minimum: 1900,
    maximum: new Date().getFullYear() + 1,
  })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({
    description: 'Color of the vehicle',
    example: 'Blue',
    maxLength: 30,
  })
  @IsString()
  @Length(1, 30)
  color: string;

  @ApiProperty({
    description: 'License plate of the vehicle',
    example: 'ABC-123',
    maxLength: 20,
  })
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Z0-9\-\s]+$/i, {
    message: 'License plate must contain only letters, numbers, hyphens, and spaces',
  })
  licensePlate: string;

  @ApiPropertyOptional({
    description: 'Array of vehicle type IDs',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  vehicleTypeIds?: string[];

  @ApiPropertyOptional({
    description: 'Number of seats in the vehicle',
    example: 4,
    minimum: 1,
    maximum: 8,
    default: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  seats?: number = 4;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class VehicleFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by vehicle make (partial match)',
    example: 'Toyota',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  make?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle model (partial match)',
    example: 'Camry',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  model?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle year',
    example: 2022,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiPropertyOptional({
    description: 'Filter by vehicle color (partial match)',
    example: 'Blue',
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @ApiPropertyOptional({
    description: 'Filter by vehicle type IDs',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim());
    }
    return value;
  })
  vehicleTypeIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by number of seats',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(8)
  seats?: number;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['make', 'model', 'year', 'color', 'seats', 'createdAt', 'isVerified'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @Matches(/^(ASC|DESC)$/i)
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}