import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ride } from './ride.entity';

@Entity('ride_tracking')
export class RideTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_id' })
  rideId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  longitude: number;

  // PostGIS Point for efficient spatial queries
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string; // POINT(longitude latitude)

  @Column({ nullable: true })
  speed?: number; // km/h

  @Column({ nullable: true })
  heading?: number; // degrees

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  // Relations
  @ManyToOne(() => Ride, (ride) => ride.trackingPoints)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;
}
