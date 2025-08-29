import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToMany } from 'typeorm';
import { DriverProfile } from './driver-profile.entity';
import { VehicleType } from './vehicle-type.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  make: string;

  @Column({ length: 50 })
  model: string;

  @Column()
  year: number;

  @Column({ length: 30 })
  color: string;

  @Column({ name: 'license_plate', length: 20, unique: true })
  licensePlate: string;

  @Column({ default: 4 })
  seats: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToMany(() => VehicleType, vehicleType => vehicleType.vehicles, { eager: true })
  vehicleTypes: VehicleType[];

  @OneToMany(() => DriverProfile, driverProfile => driverProfile.vehicle)
  driverProfiles: DriverProfile[];
}
