import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_types')
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  name: string;

  @Column({ length: 100, nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToMany(() => Vehicle, vehicle => vehicle.vehicleTypes)
  @JoinTable({ name: 'vehicle_vehicle_types' }) // pivot table name
  vehicles: Vehicle[];
}
