import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NearbyDriver, Coordinates, SurgeArea } from '../interfaces/location.interfaces';
import { DriverProfile } from '../../../database/entities/driver-profile.entity';
import { SurgePricing } from '../../../database/entities/surge-pricing.entity';
import { RideTracking } from '../../../database/entities/ride-tracking.entity';

// Define interfaces for query results
interface NearbyDriverQueryResult {
  driver_id: string;
  user_id: string;
  latitude: string;
  longitude: string;
  distance_km: string;
  rating: string;
  vehicle_type: string;
  status: string;
}

interface SurgeAreaQueryResult {
  id: string;
  area_name: string;
  multiplier: string;
  is_active: boolean;
}

interface SurgeMultiplierQueryResult {
  multiplier: string;
}

interface DistanceQueryResult {
  distance_km: string;
}

@Injectable()
export class PostgisService {
  private readonly logger = new Logger(PostgisService.name);

  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(SurgePricing)
    private readonly surgePricingRepository: Repository<SurgePricing>,
    @InjectRepository(RideTracking)
    private readonly rideTrackingRepository: Repository<RideTracking>,
  ) {}

  async findNearbyDrivers(
    coordinates: Coordinates,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<NearbyDriver[]> {
    const query = `
      SELECT 
        dp.id as driver_id,
        dp.user_id,
        dp.current_latitude as latitude,
        dp.current_longitude as longitude,
        ST_Distance(
          dp.current_location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km,
        dp.rating,
        v.vehicle_type,
        dp.status
      FROM driver_profiles dp
      LEFT JOIN vehicles v ON dp.vehicle_id = v.id
      WHERE 
        dp.is_online = true 
        AND dp.status = 'online'
        AND dp.current_location IS NOT NULL
        AND ST_DWithin(
          dp.current_location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )
      ORDER BY distance_km ASC
      LIMIT $4
    `;

    const rawResult: unknown = await this.driverProfileRepository.query(query, [
      coordinates.longitude,
      coordinates.latitude,
      radiusKm,
      limit,
    ]);

    const result = rawResult as NearbyDriverQueryResult[];

    return result.map(
      (row: NearbyDriverQueryResult): NearbyDriver => ({
        driverId: row.driver_id,
        userId: row.user_id,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        distanceKm: parseFloat(row.distance_km),
        rating: parseFloat(row.rating),
        vehicleType: row.vehicle_type,
        status: row.status,
      }),
    );
  }

  async updateDriverLocation(driverId: string, coordinates: Coordinates): Promise<void> {
    this.logger.debug('Updating driver location', { driverId, coordinates });

    const query = `
      UPDATE driver_profiles 
      SET 
        current_latitude = $2::double precision,
        current_longitude = $3::double precision,
        current_location = ST_SetSRID(ST_MakePoint($3::double precision, $2::double precision), 4326)
      WHERE id = $1
    `;

    await this.driverProfileRepository.query(query, [
      driverId,
      coordinates.latitude,
      coordinates.longitude,
    ]);
  }

  async addRideTrackingPoint(
    rideId: string,
    coordinates: Coordinates,
    speed?: number,
    heading?: number,
  ): Promise<void> {
    const trackingPoint = this.rideTrackingRepository.create({
      rideId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      location: `POINT(${coordinates.longitude} ${coordinates.latitude})`,
      speed,
      heading,
    });

    await this.rideTrackingRepository.save(trackingPoint);
  }

  async getSurgeMultiplier(coordinates: Coordinates): Promise<number> {
    const query = `
      SELECT multiplier
      FROM surge_pricing
      WHERE 
        is_active = true
        AND starts_at <= NOW()
        AND (ends_at IS NULL OR ends_at >= NOW())
        AND ST_Contains(
          area::geometry,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        )
      ORDER BY multiplier DESC
      LIMIT 1
    `;

    const rawResult: unknown = await this.surgePricingRepository.query(query, [
      coordinates.longitude,
      coordinates.latitude,
    ]);

    const result = rawResult as SurgeMultiplierQueryResult[];

    return result.length > 0 ? parseFloat(result[0].multiplier) : 1.0;
  }

  async getActiveSurgeAreas(): Promise<SurgeArea[]> {
    const query = `
      SELECT 
        id,
        area_name,
        multiplier,
        is_active
      FROM surge_pricing
      WHERE 
        is_active = true
        AND starts_at <= NOW()
        AND (ends_at IS NULL OR ends_at >= NOW())
    `;

    const rawResult: unknown = await this.surgePricingRepository.query(query);
    const result = rawResult as SurgeAreaQueryResult[];

    return result.map(
      (row: SurgeAreaQueryResult): SurgeArea => ({
        id: row.id,
        areaName: row.area_name,
        multiplier: parseFloat(row.multiplier),
        isActive: row.is_active,
      }),
    );
  }

  async calculateDistance(point1: Coordinates, point2: Coordinates): Promise<number> {
    const query = `
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
      ) / 1000 as distance_km
    `;

    const rawResult: unknown = await this.driverProfileRepository.query(query, [
      point1.longitude,
      point1.latitude,
      point2.longitude,
      point2.latitude,
    ]);

    const result = rawResult as DistanceQueryResult[];

    return parseFloat(result[0].distance_km);
  }
}
