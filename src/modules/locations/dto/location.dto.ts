import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class FindNearbyDriversDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number = 5;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

export class GeocodeDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 5;

  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class RouteDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  startLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  startLongitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  endLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  endLongitude: number;

  @IsOptional()
  @IsString()
  profile?: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car';
}
