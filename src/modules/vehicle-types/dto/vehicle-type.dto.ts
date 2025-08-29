import { IsString, IsBoolean, IsOptional, Length, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateVehicleTypeDto {
  @ApiProperty({
    description: 'Name of the vehicle type',
    example: 'sedan',
    maxLength: 50
  })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the vehicle type',
    example: 'A standard four-door passenger car',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier for the vehicle type (used when no file is uploaded)',
    example: 'car-sedan',
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Icon file upload (jpg, jpeg, png, gif, svg, webp - max 5MB)',
    type: 'string',
    format: 'binary'
  })
  iconFile?: any; // This is for Swagger documentation only

   @ApiPropertyOptional({
    description: 'Whether the vehicle type is active',
    example: true,
    default: true
  })
  
  @IsOptional()
  @Transform(({ value }) => {
    // Handle string values from form-data
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      // Handle '1' and '0' as well
      if (value === '1') return true;
      if (value === '0') return false;
    }
    return value; // Return as-is if already boolean
  })
  @IsBoolean()
  isActive?: boolean = true;
}


export class UpdateVehicleTypeDto extends PartialType(CreateVehicleTypeDto) {}

export class VehicleTypeFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by vehicle type name (partial match)',
    example: 'sedan'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by description (partial match)',
    example: 'passenger'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
    enum: ['name', 'createdAt', 'isActive']
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'isActive'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}