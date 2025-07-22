import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';

import { RideRequest } from 'src/database/entities/ride-request.entity';
import { RideType } from 'src/database/entities/ride.entity';
import { 
  CreateRideRequestDto, 
  CreateRideRequestResponseDto, 
  FindRideRequestsDto, 
  NearbyRideRequestDto, 
  RideRequestResponseDto, 
  RideRequestsResponseDto, 
  RideRequestStatsDto 
} from './dto/ride-requests.dto';
import { LocationsService } from '../locations/services/locations.service';

@Injectable()
export class RideRequestsService {
  constructor(
    @InjectRepository(RideRequest)
    private readonly rideRequestRepository: Repository<RideRequest>,
    private readonly locationsService: LocationsService,
  ) {}

  async createRideRequest(createDto: CreateRideRequestDto): Promise<CreateRideRequestResponseDto> {
    try {
      // Check if user has an active ride request
      const existingActiveRequest = await this.rideRequestRepository.findOne({
        where: {
          riderId: createDto.riderId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (existingActiveRequest) {
        throw new BadRequestException('User already has an active ride request');
      }

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (createDto.expiresInMinutes || 15));

      // Use LocationsService for enhanced calculations
      const pickupCoords = { 
        latitude: createDto.pickupLatitude, 
        longitude: createDto.pickupLongitude 
      };
      const destinationCoords = { 
        latitude: createDto.destinationLatitude, 
        longitude: createDto.destinationLongitude 
      };

      // Calculate route and fare estimate
      const [routeResult, fareEstimate] = await Promise.all([
        this.locationsService.calculateRoute(pickupCoords, destinationCoords),
        this.locationsService.calculateFareEstimate(pickupCoords, destinationCoords, createDto.rideType)
      ]);

      // Use raw SQL to insert with PostGIS functions
      const queryRunner = this.rideRequestRepository.manager.connection.createQueryRunner();
      
      try {
        const result = await queryRunner.query(`
          INSERT INTO ride_requests (
            rider_id, pickup_latitude, pickup_longitude, pickup_location,
            destination_latitude, destination_longitude, destination_location,
            ride_type, max_wait_time, is_active, expires_at,
            estimated_distance, estimated_duration, estimated_fare, surge_multiplier
          )
          VALUES (
            $1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326)::geography,
            $6, $7, ST_SetSRID(ST_Point($8, $9), 4326)::geography,
            $10, $11, $12, $13, $14, $15, $16, $17
          )
          RETURNING id, rider_id, pickup_latitude, pickup_longitude, 
                  destination_latitude, destination_longitude, ride_type, 
                  max_wait_time, is_active, expires_at, created_at,
                  estimated_distance, estimated_duration, estimated_fare, surge_multiplier
        `, [
          createDto.riderId,
          createDto.pickupLatitude,
          createDto.pickupLongitude,
          createDto.pickupLongitude,  // ST_Point expects (longitude, latitude)
          createDto.pickupLatitude,
          createDto.destinationLatitude,
          createDto.destinationLongitude,
          createDto.destinationLongitude,  // ST_Point expects (longitude, latitude)
          createDto.destinationLatitude,
          createDto.rideType,
          createDto.maxWaitTime || 300,
          true,
          expiresAt,
          routeResult.distance / 1000, // Convert to km
          routeResult.duration / 60,   // Convert to minutes
          fareEstimate.estimatedFare,
          fareEstimate.surgeMultiplier
        ]);

        const savedRequest = result[0];

        return {
          id: savedRequest.id,
          riderId: savedRequest.rider_id,
          pickupLatitude: parseFloat(savedRequest.pickup_latitude),
          pickupLongitude: parseFloat(savedRequest.pickup_longitude),
          destinationLatitude: parseFloat(savedRequest.destination_latitude),
          destinationLongitude: parseFloat(savedRequest.destination_longitude),
          rideType: savedRequest.ride_type,
          maxWaitTime: savedRequest.max_wait_time,
          expiresAt: savedRequest.expires_at,
          createdAt: savedRequest.created_at,
          estimatedFare: parseFloat(savedRequest.estimated_fare),
          estimatedDistance: parseFloat(savedRequest.estimated_distance),
          estimatedDuration: parseFloat(savedRequest.estimated_duration),
          surgeMultiplier: parseFloat(savedRequest.surge_multiplier),
          routeGeometry: routeResult.geometry,
        };
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating ride request:', error);
      throw new InternalServerErrorException('Failed to create ride request');
    }
  }

  async getRideRequest(requestId: string): Promise<RideRequestResponseDto> {
    const request = await this.rideRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Ride request not found');
    }

    return this.mapToResponseDto(request);
  }

  async findRideRequests(filterDto: FindRideRequestsDto): Promise<RideRequestsResponseDto> {
    const {
      riderId,
      rideType,
      isActive,
      nearLatitude,
      nearLongitude,
      radiusKm = 5,
      createdAfter,
      createdBefore,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.rideRequestRepository.createQueryBuilder('request');

    // Apply filters
    if (riderId) {
      queryBuilder.andWhere('request.riderId = :riderId', { riderId });
    }

    if (rideType) {
      queryBuilder.andWhere('request.rideType = :rideType', { rideType });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('request.isActive = :isActive', { isActive });
      
      if (isActive) {
        // Only show non-expired active requests
        queryBuilder.andWhere('request.expiresAt > :now', { now: new Date() });
      }
    }

    if (nearLatitude && nearLongitude) {
      // Use PostGIS for spatial queries
      const point = `POINT(${nearLongitude} ${nearLatitude})`;
      queryBuilder.andWhere(
        `ST_DWithin(request.pickup_location::geography, ST_GeogFromText(:point), :radius)`,
        { point, radius: radiusKm * 1000 }, // Convert km to meters
      );
    }

    if (createdAfter) {
      queryBuilder.andWhere('request.createdAt >= :createdAfter', { createdAfter });
    }

    if (createdBefore) {
      queryBuilder.andWhere('request.createdAt <= :createdBefore', { createdBefore });
    }

    // Apply sorting
    if (nearLatitude && nearLongitude && sortBy === 'distance') {
      const point = `POINT(${nearLongitude} ${nearLatitude})`;
      queryBuilder.addSelect(
        `ST_Distance(request.pickup_location::geography, ST_GeogFromText('${point}'))`,
        'distance'
      );
      queryBuilder.orderBy('distance', sortOrder);
    } else {
      queryBuilder.orderBy(`request.${sortBy}`, sortOrder);
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [requests, total] = await queryBuilder.getManyAndCount();

    return {
      requests: requests.map((request) => this.mapToResponseDto(request)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cancelRideRequest(requestId: string): Promise<{ message: string }> {
    const request = await this.rideRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Ride request not found');
    }

    if (!request.isActive) {
      throw new BadRequestException('Ride request is already inactive');
    }

    try {
      request.isActive = false;
      await this.rideRequestRepository.save(request);

      return { message: 'Ride request cancelled successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to cancel ride request');
    }
  }

  async getNearbyRequests(
    driverId: string,
    radiusKm: number = 5,
  ): Promise<NearbyRideRequestDto[]> {
    // Get driver's current location using LocationsService
    const driverLocation = await this.getDriverLocation(driverId);

    if (!driverLocation) {
      throw new NotFoundException('Driver location not found');
    }

    const point = `POINT(${driverLocation.longitude} ${driverLocation.latitude})`;
    const radiusMeters = radiusKm * 1000;

    const query = `
      SELECT r.*, 
             ST_Distance(r.pickup_location::geography, ST_GeogFromText($1)) as distance_meters
      FROM ride_requests r
      WHERE r.is_active = true 
        AND r.expires_at > NOW()
        AND ST_DWithin(r.pickup_location::geography, ST_GeogFromText($1), $2)
      ORDER BY distance_meters ASC
    `;

    const results = await this.rideRequestRepository.query(query, [point, radiusMeters]);

    // Enhanced with LocationsService calculations
    const enhancedResults = await Promise.all(
      results.map(async (result: any) => {
        const pickupCoords = { 
          latitude: result.pickup_latitude, 
          longitude: result.pickup_longitude 
        };
        
        // Calculate accurate route from driver to pickup
        const routeToPickup = await this.locationsService.calculateRoute(
          driverLocation,
          pickupCoords
        );

        return {
          ...this.mapToResponseDto(result),
          distanceFromDriver: Math.round((result.distance_meters / 1000) * 100) / 100,
          estimatedPickupTime: Math.ceil(routeToPickup.duration / 60), // minutes
          routeToPickup: routeToPickup.geometry,
        };
      })
    );

    return enhancedResults;
  }

  async geocodePickupLocation(requestId: string, query: string): Promise<any> {
    const request = await this.getRideRequest(requestId);
    
    // Use LocationsService for geocoding
    const results = await this.locationsService.geocodeAddress(query, 5);
    
    return {
      requestId,
      geocodeResults: results,
      currentPickup: {
        latitude: request.pickupLatitude,
        longitude: request.pickupLongitude,
      },
    };
  }

  async updatePickupLocation(
    requestId: string, 
    newLatitude: number, 
    newLongitude: number
  ): Promise<RideRequestResponseDto> {
    const request = await this.rideRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Ride request not found');
    }

    if (!request.isActive) {
      throw new BadRequestException('Cannot update inactive ride request');
    }

    // Recalculate fare with new pickup location
    const newPickupCoords = { latitude: newLatitude, longitude: newLongitude };
    const destinationCoords = { 
      latitude: request.destinationLatitude, 
      longitude: request.destinationLongitude 
    };

    const [routeResult, fareEstimate] = await Promise.all([
      this.locationsService.calculateRoute(newPickupCoords, destinationCoords),
      this.locationsService.calculateFareEstimate(newPickupCoords, destinationCoords, request.rideType)
    ]);

    // Update with raw SQL to handle PostGIS
    const queryRunner = this.rideRequestRepository.manager.connection.createQueryRunner();
    
    try {
      await queryRunner.query(`
        UPDATE ride_requests 
        SET pickup_latitude = $1, 
            pickup_longitude = $2,
            pickup_location = ST_SetSRID(ST_Point($3, $4), 4326)::geography,
            estimated_distance = $5,
            estimated_duration = $6,
            estimated_fare = $7,
            surge_multiplier = $8
        WHERE id = $9
      `, [
        newLatitude,
        newLongitude,
        newLongitude, // ST_Point expects (longitude, latitude)
        newLatitude,
        routeResult.distance / 1000,
        routeResult.duration / 60,
        fareEstimate.estimatedFare,
        fareEstimate.surgeMultiplier,
        requestId
      ]);

      // Fetch updated request
      const updatedRequest = await this.getRideRequest(requestId);
      return updatedRequest;
    } finally {
      await queryRunner.release();
    }
  }

  // Cleanup expired requests (should be called by a cron job)
  async cleanupExpiredRequests(): Promise<{ deactivated: number }> {
    const result = await this.rideRequestRepository.update(
      {
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      {
        isActive: false,
      },
    );

    return { deactivated: result.affected || 0 };
  }

  async getRideRequestStats(riderId?: string): Promise<RideRequestStatsDto> {
    const baseQuery = this.rideRequestRepository.createQueryBuilder('request');

    if (riderId) {
      baseQuery.where('request.riderId = :riderId', { riderId });
    }

    const [
      totalRequests,
      activeRequests,
      expiredRequests,
      rideTypeStats,
      avgWaitTime,
      peakHours,
      avgDistance,
      avgFare,
    ] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().andWhere('request.isActive = true').getCount(),
      baseQuery
        .clone()
        .andWhere('request.isActive = false')
        .andWhere('request.expiresAt < :now', { now: new Date() })
        .getCount(),
      this.getRideTypeStats(riderId),
      this.getAverageWaitTime(riderId),
      this.getPeakHours(riderId),
      this.getAverageDistance(riderId),
      this.getAverageFare(riderId),
    ]);

    // Get active surge areas
    const activeSurgeAreas = await this.locationsService.getActiveSurgeAreas();

    return {
      totalRequests,
      activeRequests,
      expiredRequests,
      requestsByRideType: rideTypeStats,
      averageWaitTime: avgWaitTime,
      peakHours,
      averageDistance: avgDistance,
      averageFare: avgFare,
      activeSurgeAreas: activeSurgeAreas.length,
    };
  }

  // Helper methods
  private mapToResponseDto(request: any): RideRequestResponseDto {
    const now = new Date();
    const timeRemaining = Math.max(0, Math.floor((new Date(request.expiresAt).getTime() - now.getTime()) / 1000));
    
    return {
      id: request.id,
      riderId: request.riderId || request.rider_id,
      pickupLatitude: Number(request.pickupLatitude || request.pickup_latitude),
      pickupLongitude: Number(request.pickupLongitude || request.pickup_longitude),
      destinationLatitude: Number(request.destinationLatitude || request.destination_latitude),
      destinationLongitude: Number(request.destinationLongitude || request.destination_longitude),
      rideType: request.rideType || request.ride_type,
      maxWaitTime: request.maxWaitTime || request.max_wait_time,
      isActive: request.isActive !== undefined ? request.isActive : request.is_active,
      expiresAt: new Date(request.expiresAt || request.expires_at),
      createdAt: new Date(request.createdAt || request.created_at),
      distanceKm: Number(request.estimatedDistance || request.estimated_distance) || 0,
      estimatedDuration: Number(request.estimatedDuration || request.estimated_duration) || 0,
      estimatedFare: Number(request.estimatedFare || request.estimated_fare) || 0,
      surgeMultiplier: Number(request.surgeMultiplier || request.surge_multiplier) || 1,
      timeRemaining,
    };
  }

  private async getDriverLocation(driverId: string): Promise<{ latitude: number; longitude: number } | null> {
    // This method should integrate with your driver location tracking
    // For now, we'll assume it's handled by LocationsService or another service
    // You might want to create a separate DriversService that uses LocationsService
    try {
      // Example implementation - you'll need to adapt this to your actual driver location storage
      const query = `
        SELECT latitude, longitude 
        FROM driver_locations 
        WHERE driver_id = $1 
        AND updated_at > NOW() - INTERVAL '5 minutes'
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      const result = await this.rideRequestRepository.query(query, [driverId]);
      
      if (result.length > 0) {
        return {
          latitude: Number(result[0].latitude),
          longitude: Number(result[0].longitude),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching driver location:', error);
      return null;
    }
  }

  private async getRideTypeStats(riderId?: string): Promise<Record<RideType, number>> {
    const baseQuery = this.rideRequestRepository.createQueryBuilder('request');
    
    if (riderId) {
      baseQuery.where('request.riderId = :riderId', { riderId });
    }

    const results = await baseQuery
      .select('request.rideType', 'rideType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('request.rideType')
      .getRawMany();

    // Initialize with all ride types set to 0
    const stats: Record<RideType, number> = {
      [RideType.ECONOMY]: 0,
      [RideType.PREMIUM]: 0,
      [RideType.POOL]: 0,
    };

    // Populate with actual data
    results.forEach(result => {
      const rideType = result.rideType as RideType;
      stats[rideType] = parseInt(result.count, 10);
    });

    return stats;
  }

  private async getAverageWaitTime(riderId?: string): Promise<number> {
    const query = this.rideRequestRepository
      .createQueryBuilder('request')
      .select('AVG(request.maxWaitTime)', 'avg');

    if (riderId) {
      query.where('request.riderId = :riderId', { riderId });
    }

    const result = await query.getRawOne();
    return Math.round(Number(result.avg) || 0);
  }

  private async getAverageDistance(riderId?: string): Promise<number> {
    const query = this.rideRequestRepository
      .createQueryBuilder('request')
      .select('AVG(request.estimatedDistance)', 'avg');

    if (riderId) {
      query.where('request.riderId = :riderId', { riderId });
    }

    const result = await query.getRawOne();
    return Math.round((Number(result.avg) || 0) * 100) / 100;
  }

  private async getAverageFare(riderId?: string): Promise<number> {
    const query = this.rideRequestRepository
      .createQueryBuilder('request')
      .select('AVG(request.estimatedFare)', 'avg');

    if (riderId) {
      query.where('request.riderId = :riderId', { riderId });
    }

    const result = await query.getRawOne();
    return Math.round((Number(result.avg) || 0) * 100) / 100;
  }

  private async getPeakHours(riderId?: string): Promise<{ hour: number; requestCount: number }[]> {
    const query = `
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as request_count
      FROM ride_requests
      ${riderId ? 'WHERE rider_id = $1' : ''}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY request_count DESC
      LIMIT 5
    `;

    const results = riderId 
      ? await this.rideRequestRepository.query(query, [riderId])
      : await this.rideRequestRepository.query(query);

    return results.map((result: any) => ({
      hour: Number(result.hour),
      requestCount: Number(result.request_count),
    }));
  }
}