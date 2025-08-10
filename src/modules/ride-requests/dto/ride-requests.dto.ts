import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RideType } from 'src/database/entities/ride.entity';

// Type definitions for GeoJSON and route data
export interface GeoJSONGeometry {
  type: string;
  coordinates: number[][];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type: string;
}

export class CreateRideRequestDto {
  @IsNotEmpty()
  @IsUUID()
  riderId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  pickupLatitude: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  pickupLongitude: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  destinationLatitude: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  destinationLongitude: number;

  @IsNotEmpty()
  @IsEnum(RideType)
  rideType: RideType;

  @IsOptional()
  @IsNumber()
  @Min(60) // Minimum 1 minute
  @Max(1800) // Maximum 30 minutes
  maxWaitTime?: number = 300; // Default 5 minutes

  @IsOptional()
  @IsNumber()
  @Min(1) // Minimum 1 minute from now
  @Max(1440) // Maximum 24 hours from now
  expiresInMinutes?: number = 15; // Default 15 minutes
}

export class UpdatePickupLocationDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  latitude: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  longitude: number;
}

export class GeocodeRequestDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5;

  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class FindRideRequestsDto {
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  nearLatitude?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  nearLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

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
      return value.toUpperCase() as 'ASC' | 'DESC';
    }
    return value;
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class RideRequestResponseDto {
  id: string;
  riderId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  rideType: RideType;
  maxWaitTime: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;

  // Enhanced calculated fields
  distanceKm?: number; // Distance from pickup to destination
  estimatedDuration?: number; // Estimated duration in minutes
  estimatedFare?: number; // Estimated fare amount
  surgeMultiplier?: number; // Current surge multiplier
  timeRemaining?: number; // Seconds until expiration

  // Optional rider information
  rider?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    rating?: number;
  };
}

export class NearbyRideRequestDto extends RideRequestResponseDto {
  distanceFromDriver: number; // Distance in kilometers from driver's location
  estimatedPickupTime: number; // Estimated time in minutes to reach pickup
  routeToPickup?: GeoJSONGeometry; // Route geometry from driver to pickup (GeoJSON)
}

export class RideRequestsResponseDto {
  requests: RideRequestResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CreateRideRequestResponseDto {
  id: string;
  riderId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  rideType: RideType;
  maxWaitTime: number;
  expiresAt: Date;
  createdAt: Date;

  // Enhanced response fields
  estimatedFare?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  surgeMultiplier?: number;
  routeGeometry?: GeoJSONGeometry; // Route geometry from pickup to destination (GeoJSON)
}

export class DriverLocationDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  latitude: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  longitude: number;
}

export class RideRequestStatsDto {
  totalRequests: number;
  activeRequests: number;
  expiredRequests: number;

  // More flexible type that accepts any string keys with number values
  requestsByRideType: { [key: string]: number };

  averageWaitTime: number;
  averageDistance?: number; // Average trip distance in km
  averageFare?: number; // Average fare amount
  activeSurgeAreas?: number; // Number of active surge areas

  peakHours: {
    hour: number;
    requestCount: number;
  }[];
}

export class GeocodeResponseDto {
  requestId: string;
  geocodeResults: {
    address: string;
    latitude: number;
    longitude: number;
    confidence: number;
    components?: {
      country?: string;
      state?: string;
      city?: string;
      street?: string;
      houseNumber?: string;
      postalCode?: string;
    };
  }[];
  currentPickup: {
    latitude: number;
    longitude: number;
  };
}

export class FareEstimateDto {
  basefare: number;
  surgeMultiplier: number;
  estimatedFare: number;
  distance: number;
  duration: number;
  rideType: RideType;
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
}

export class RouteInfoDto {
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  geometry: GeoJSONGeometry; // GeoJSON geometry
  instructions?: RouteInstruction[];
}

// Request DTOs for new endpoints
export class GetNearbyRequestsDto {
  @IsNotEmpty()
  @IsUUID()
  driverId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(20)
  radiusKm?: number = 5;
}

export class CancelRideRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RideRequestActionResponseDto {
  message: string;
  success: boolean;
  data?: unknown;
}
