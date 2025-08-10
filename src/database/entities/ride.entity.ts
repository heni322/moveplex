import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { RideTracking } from './ride-tracking.entity';
import { Payment } from './payment.entity'; // Import PaymentStatus from payment.entity
import { RatingReview } from './rating-review.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export enum RideType {
  ECONOMY = 'economy',
  PREMIUM = 'premium',
  POOL = 'pool',
}

export enum RideStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  DRIVER_ARRIVING = 'driver_arriving',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rider_id' })
  riderId: string;

  @Column({ name: 'driver_id', nullable: true })
  driverId?: string;

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

  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress: string;

  // PostGIS Point for pickup location
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'pickup_location',
  })
  pickupLocation: string; // POINT(longitude latitude)

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

  @Column({ name: 'destination_address', type: 'text' })
  destinationAddress: string;

  // PostGIS Point for destination location
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'destination_location',
  })
  destinationLocation: string; // POINT(longitude latitude)

  @Column({
    type: 'enum',
    enum: RideType,
    name: 'ride_type',
  })
  rideType: RideType;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.REQUESTED,
  })
  status: RideStatus;

  @Column({
    name: 'fare_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  fareAmount?: number;

  @Column({
    name: 'distance_km',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  distanceKm?: number;

  @Column({ name: 'duration_minutes', nullable: true })
  durationMinutes?: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  // Relations
  @ManyToOne(() => User, user => user.ridesAsRider)
  @JoinColumn({ name: 'rider_id' })
  rider: User;

  @ManyToOne(() => User, user => user.ridesAsDriver)
  @JoinColumn({ name: 'driver_id' })
  driver?: User;

  @OneToMany(() => RideTracking, tracking => tracking.ride)
  trackingPoints: RideTracking[];

  @OneToMany(() => Payment, payment => payment.ride)
  payments: Payment[];

  @OneToMany(() => RatingReview, rating => rating.ride)
  ratings: RatingReview[];
}
