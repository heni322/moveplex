import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto } from './dto/vehicles.dto';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { VehicleType } from '../../database/entities/vehicle-type.entity';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  async createVehicle(createDto: CreateVehicleDto): Promise<Vehicle> {
    // Check if license plate already exists
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { licensePlate: createDto.licensePlate.toUpperCase() },
    });

    if (existingVehicle) {
      throw new ConflictException('Vehicle with this license plate already exists');
    }

    // Validate vehicle types exist and are active
    let vehicleTypes: VehicleType[] = [];
    if (createDto.vehicleTypeIds && createDto.vehicleTypeIds.length > 0) {
      vehicleTypes = await this.vehicleTypeRepository.find({
        where: { 
          id: In(createDto.vehicleTypeIds),
          isActive: true 
        },
      });

      if (vehicleTypes.length !== createDto.vehicleTypeIds.length) {
        throw new BadRequestException('One or more vehicle types are invalid or inactive');
      }
    }

    const vehicle = this.vehicleRepository.create({
      make: createDto.make,
      model: createDto.model,
      year: createDto.year,
      color: createDto.color,
      licensePlate: createDto.licensePlate.toUpperCase(),
      seats: createDto.seats || 4,
      vehicleTypes,
    });

    return this.vehicleRepository.save(vehicle);
  }

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
      relations: ['driverProfiles', 'vehicleTypes'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async getVehicles(filterDto: VehicleFilterDto): Promise<PaginatedResponse<Vehicle>> {
    const {
      make,
      model,
      year,
      color,
      vehicleTypeIds,
      seats,
      isVerified,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.vehicleTypes', 'vehicleTypes')
      .leftJoinAndSelect('vehicle.driverProfiles', 'driverProfiles');

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

    if (vehicleTypeIds && vehicleTypeIds.length > 0) {
      queryBuilder.andWhere('vehicleTypes.id IN (:...vehicleTypeIds)', {
        vehicleTypeIds,
      });
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
      'seats',
      'createdAt',
      'isVerified',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`vehicle.${sortField}`, sortOrder);

    // Add secondary sort by createdAt for consistency
    if (sortField !== 'createdAt') {
      queryBuilder.addOrderBy('vehicle.createdAt', 'DESC');
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [vehicles, total] = await queryBuilder.getManyAndCount();

    return {
      data: vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    // Handle vehicle types update
    if (updateDto.vehicleTypeIds) {
      const vehicleTypes = await this.vehicleTypeRepository.find({
        where: { 
          id: In(updateDto.vehicleTypeIds),
          isActive: true 
        },
      });

      if (vehicleTypes.length !== updateDto.vehicleTypeIds.length) {
        throw new BadRequestException('One or more vehicle types are invalid or inactive');
      }

      vehicle.vehicleTypes = vehicleTypes;
    }

    // Update other fields
    if (updateDto.make) vehicle.make = updateDto.make;
    if (updateDto.model) vehicle.model = updateDto.model;
    if (updateDto.year) vehicle.year = updateDto.year;
    if (updateDto.color) vehicle.color = updateDto.color;
    if (updateDto.licensePlate) vehicle.licensePlate = updateDto.licensePlate.toUpperCase();
    if (updateDto.seats) vehicle.seats = updateDto.seats;

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
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.isVerified) {
      throw new BadRequestException('Vehicle is already verified');
    }

    vehicle.isVerified = true;
    return this.vehicleRepository.save(vehicle);
  }

  async unverifyVehicle(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (!vehicle.isVerified) {
      throw new BadRequestException('Vehicle is already unverified');
    }

    vehicle.isVerified = false;
    return this.vehicleRepository.save(vehicle);
  }

  async getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { licensePlate: licensePlate.toUpperCase() },
      relations: ['driverProfiles', 'vehicleTypes'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async getVerifiedVehicles(): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { isVerified: true },
      relations: ['vehicleTypes'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVehiclesByType(vehicleTypeId: string): Promise<Vehicle[]> {
    return this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.vehicleTypes', 'vehicleTypes')
      .leftJoinAndSelect('vehicle.driverProfiles', 'driverProfiles')
      .where('vehicleTypes.id = :vehicleTypeId', { vehicleTypeId })
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();
  }

  async getVehiclesByMultipleTypes(vehicleTypeIds: string[]): Promise<Vehicle[]> {
    return this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.vehicleTypes', 'vehicleTypes')
      .leftJoinAndSelect('vehicle.driverProfiles', 'driverProfiles')
      .where('vehicleTypes.id IN (:...vehicleTypeIds)', { vehicleTypeIds })
      .orderBy('vehicle.createdAt', 'DESC')
      .getMany();
  }

  async getVehicleStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    byMake: Record<string, number>;
    byYear: Record<string, number>;
    bySeats: Record<string, number>;
    averageYear: number;
  }> {
    const [total, verified] = await Promise.all([
      this.vehicleRepository.count(),
      this.vehicleRepository.count({ where: { isVerified: true } }),
    ]);

    // Get stats by make
    const makeStats = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('vehicle.make', 'make')
      .addSelect('COUNT(*)', 'count')
      .groupBy('vehicle.make')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Get stats by year
    const yearStats = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('vehicle.year', 'year')
      .addSelect('COUNT(*)', 'count')
      .groupBy('vehicle.year')
      .orderBy('vehicle.year', 'DESC')
      .getRawMany();

    // Get stats by seats
    const seatsStats = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('vehicle.seats', 'seats')
      .addSelect('COUNT(*)', 'count')
      .groupBy('vehicle.seats')
      .orderBy('vehicle.seats', 'ASC')
      .getRawMany();

    // Calculate average year
    const avgYearResult = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('AVG(vehicle.year)', 'avgYear')
      .getRawOne();

    const byMake = makeStats.reduce((acc, stat) => {
      acc[stat.make] = parseInt(stat.count);
      return acc;
    }, {});

    const byYear = yearStats.reduce((acc, stat) => {
      acc[stat.year] = parseInt(stat.count);
      return acc;
    }, {});

    const bySeats = seatsStats.reduce((acc, stat) => {
      acc[stat.seats] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      total,
      verified,
      unverified: total - verified,
      byMake,
      byYear,
      bySeats,
      averageYear: parseFloat(avgYearResult?.avgYear) || 0,
    };
  }

  async searchVehicles(searchTerm: string): Promise<Vehicle[]> {
    return this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.vehicleTypes', 'vehicleTypes')
      .where('LOWER(vehicle.make) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('LOWER(vehicle.model) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('LOWER(vehicle.color) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('vehicle.licensePlate LIKE :searchTerm', {
        searchTerm: `%${searchTerm.toUpperCase()}%`,
      })
      .orderBy('vehicle.createdAt', 'DESC')
      .take(20)
      .getMany();
  }

  async bulkVerifyVehicles(vehicleIds: string[]): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const vehicleId of vehicleIds) {
      try {
        await this.verifyVehicle(vehicleId);
        updated++;
      } catch (error) {
        errors.push(`Vehicle ${vehicleId}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  async getVehiclesByMakeAndModel(make: string, model: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: {
        make: make.toLowerCase(),
        model: model.toLowerCase(),
      },
      relations: ['vehicleTypes', 'driverProfiles'],
      order: { year: 'DESC' },
    });
  }
}