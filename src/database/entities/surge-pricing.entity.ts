import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('surge_pricing')
export class SurgePricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'area_name' })
  areaName: string;

  // PostGIS Polygon for the surge area
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  area: string; // POLYGON geometry

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    name: 'multiplier',
  })
  multiplier: number; // e.g., 1.5x, 2.0x

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at' })
  startsAt: Date;

  @Column({ name: 'ends_at', nullable: true })
  endsAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    reason?: string; // 'high_demand', 'weather', 'event'
    demandLevel?: number;
    availableDrivers?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
