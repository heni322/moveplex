import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RideType } from './ride.entity';

@Entity('ride_requests')
export class RideRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rider_id' })
  riderId: string;

  @Column({
    name: 'pickup_latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  pickupLatitude: number;

  @Column({
    name: 'pickup_longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  pickupLongitude: number;

  // PostGIS Point for efficient spatial matching
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'pickup_location',
  })
  pickupLocation: string;

  @Column({
    name: 'destination_latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  destinationLatitude: number;

  @Column({
    name: 'destination_longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  destinationLongitude: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'destination_location',
  })
  destinationLocation: string;

  @Column({
    type: 'enum',
    enum: RideType,
    name: 'ride_type',
  })
  rideType: RideType;

  @Column({ name: 'max_wait_time', default: 300 }) // seconds
  maxWaitTime: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('decimal', { name: 'estimated_distance', precision: 10, scale: 4, nullable: true })
  estimatedDistance: number;

  @Column('decimal', { name: 'estimated_duration', precision: 10, scale: 2, nullable: true })
  estimatedDuration: number;

  @Column('decimal', { name: 'estimated_fare', precision: 10, scale: 2, nullable: true })
  estimatedFare: number;

  @Column('decimal', { name: 'surge_multiplier', precision: 3, scale: 2, default: 1.0 })
  surgeMultiplier: number;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
