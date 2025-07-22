import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  Index,
  Point,
} from 'typeorm';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  ON_TRIP = 'on_trip',
}

@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'license_number', length: 100 })
  licenseNumber: string;

  @Column({ name: 'license_expiry', type: 'date' })
  licenseExpiry: Date;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({
    name: 'current_latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  currentLatitude?: number;

  @Column({
    name: 'current_longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  currentLongitude?: number;

  // PostGIS Point for efficient spatial queries
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    name: 'current_location',
  })
  currentLocation?: Point; // Will store POINT(longitude latitude)

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 5.0,
  })
  rating: number;

  @Column({ name: 'total_rides', default: 0 })
  totalRides: number;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status: DriverStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToOne(() => User, (user) => user.driverProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.driverProfiles)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;
}