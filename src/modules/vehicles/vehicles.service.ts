import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto } from './dto/vehicles.dto';
import { Vehicle } from 'src/database/entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async createVehicle(createDto: CreateVehicleDto): Promise<Vehicle> {
    // Check if license plate already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { licensePlate: createDto.licensePlate.toUpperCase() },
    });

    if (existingVehicle) {
      throw new ConflictException('Vehicle with this license plate already exists');
    }

    const vehicle = this.vehicleRepository.create({
      ...createDto,
      licensePlate: createDto.licensePlate.toUpperCase(),
    });

    return this.vehicleRepository.save(vehicle);
  }

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
      relations: ['driverProfiles'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async getVehicles(filterDto: VehicleFilterDto): Promise<{
    vehicles: Vehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      make,
      model,
      year,
      color,
      vehicleType,
      seats,
      isVerified,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.vehicleRepository.createQueryBuilder('vehicle');

    // Apply filters
    if (make) {
      queryBuilder.andWhere('LOWER(vehicle.make) LIKE LOWER(:make)', {
        make: `%${make}%`,
      });
    }

    if (model) {
      queryBuilder.andWhere('LOWER(vehicle.model) LIKE LOWER(:model)', {
        model: `%${model}%`,
      });
    }

    if (year) {
      queryBuilder.andWhere('vehicle.year = :year', { year });
    }

    if (color) {
      queryBuilder.andWhere('LOWER(vehicle.color) LIKE LOWER(:color)', {
        color: `%${color}%`,
      });
    }

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicleType = :vehicleType', { vehicleType });
    }

    if (seats) {
      queryBuilder.andWhere('vehicle.seats = :seats', { seats });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('vehicle.isVerified = :isVerified', { isVerified });
    }

    // Apply sorting
    const allowedSortFields = [
      'make',
      'model',
      'year',
      'color',
      'vehicleType',
      'seats',
      'createdAt',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`vehicle.${sortField}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [vehicles, total] = await queryBuilder.getManyAndCount();

    return {
      vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateVehicle(vehicleId: string, updateDto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.getVehicle(vehicleId);

    // Check if license plate is being updated and if it already exists
    if (updateDto.licensePlate && updateDto.licensePlate.toUpperCase() !== vehicle.licensePlate) {
      const existingVehicle = await this.vehicleRepository.findOne({
        where: { licensePlate: updateDto.licensePlate.toUpperCase() },
      });

      if (existingVehicle) {
        throw new ConflictException('Vehicle with this license plate already exists');
      }
    }

    // Update the vehicle
    const updatedData = {
      ...updateDto,
      ...(updateDto.licensePlate && { licensePlate: updateDto.licensePlate.toUpperCase() }),
    };

    Object.assign(vehicle, updatedData);
    return this.vehicleRepository.save(vehicle);
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    const vehicle = await this.getVehicle(vehicleId);

    // Check if vehicle has associated driver profiles
    if (vehicle.driverProfiles && vehicle.driverProfiles.length > 0) {
      throw new BadRequestException('Cannot delete vehicle with associated driver profiles');
    }

    await this.vehicleRepository.remove(vehicle);
  }

  async verifyVehicle(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.getVehicle(vehicleId);

    if (vehicle.isVerified) {
      throw new BadRequestException('Vehicle is already verified');
    }

    vehicle.isVerified = true;
    return this.vehicleRepository.save(vehicle);
  }

  async getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { licensePlate: licensePlate.toUpperCase() },
      relations: ['driverProfiles'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  // Additional utility methods
  async getVerifiedVehicles(): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { isVerified: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getVehiclesByType(vehicleType: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { vehicleType: vehicleType as any },
      order: { createdAt: 'DESC' },
    });
  }

  async getVehicleStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    byType: Record<string, number>;
  }> {
    const [total, verified] = await Promise.all([
      this.vehicleRepository.count(),
      this.vehicleRepository.count({ where: { isVerified: true } }),
    ]);

    const typeStats = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('vehicle.vehicleType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('vehicle.vehicleType')
      .getRawMany();

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      total,
      verified,
      unverified: total - verified,
      byType,
    };
  }
}
