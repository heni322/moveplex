import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VehicleType } from '../../database/entities/vehicle-type.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Repository, ILike } from 'typeorm';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, VehicleTypeFilterDto } from './dto/vehicle-type.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { FileUploadService } from '../../common/services/file-upload.service';

@Injectable()
export class VehicleTypeService {
  constructor(
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private readonly fileUploadService: FileUploadService, 
  ) {}

  async create(
    createVehicleTypeDto: CreateVehicleTypeDto, 
    iconFile?: Express.Multer.File
  ): Promise<VehicleType> {
    // Check if name already exists
    const existingVehicleType = await this.vehicleTypeRepository.findOne({
      where: { name: createVehicleTypeDto.name.toLowerCase() },
    });

    if (existingVehicleType) {
      throw new ConflictException(`Vehicle type with name '${createVehicleTypeDto.name}' already exists`);
    }

    let iconPath: string | undefined;

    // Handle file upload if provided
    if (iconFile) {
      try {
        // Upload file and get the path/URL
        iconPath = await this.fileUploadService.uploadFile(
          iconFile, 
          'vehicle-type-icons' // folder name
        );
      } catch (error) {
        throw new BadRequestException('Failed to upload icon file');
      }
    }

    const vehicleType = this.vehicleTypeRepository.create({
      ...createVehicleTypeDto,
      name: createVehicleTypeDto.name.toLowerCase(), // Store in lowercase for consistency
      icon: iconPath || createVehicleTypeDto.icon, // Use uploaded file path or provided icon string
    });

    return await this.vehicleTypeRepository.save(vehicleType);
  }

  async findAll(filterDto: VehicleTypeFilterDto): Promise<PaginatedResponse<VehicleType>> {
    const queryBuilder = this.vehicleTypeRepository
      .createQueryBuilder('vehicleType')
      .loadRelationCountAndMap('vehicleType.vehicleCount', 'vehicleType.vehicles');

    // Apply filters
    if (filterDto.name) {
      queryBuilder.andWhere('LOWER(vehicleType.name) LIKE LOWER(:name)', {
        name: `%${filterDto.name}%`,
      });
    }

    if (filterDto.description) {
      queryBuilder.andWhere('LOWER(vehicleType.description) LIKE LOWER(:description)', {
        description: `%${filterDto.description}%`,
      });
    }

    if (filterDto.isActive !== undefined) {
      queryBuilder.andWhere('vehicleType.isActive = :isActive', {
        isActive: filterDto.isActive,
      });
    }

    // Sorting
    const validSortFields = ['name', 'createdAt', 'isActive'];
    const sortBy = validSortFields.includes(filterDto.sortBy) ? filterDto.sortBy : 'createdAt';
    queryBuilder.orderBy(`vehicleType.${sortBy}`, filterDto.sortOrder);

    // Add secondary sort by name for consistency
    if (sortBy !== 'name') {
      queryBuilder.addOrderBy('vehicleType.name', 'ASC');
    }

    // Pagination
    queryBuilder.skip(filterDto.skip).take(filterDto.limit);

    const [vehicleTypes, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / (filterDto.limit ?? 10));

    return {
      data: vehicleTypes,
      pagination: {
        page: filterDto.page ?? 1,
        limit: filterDto.limit ?? 10,
        total,
        totalPages,
      },
    };
  }

  async findAllActive(): Promise<VehicleType[]> {
    return await this.vehicleTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findAllWithVehicleCount(): Promise<(VehicleType & { vehicleCount: number })[]> {
    return await this.vehicleTypeRepository
      .createQueryBuilder('vehicleType')
      .loadRelationCountAndMap('vehicleType.vehicleCount', 'vehicleType.vehicles')
      .orderBy('vehicleType.name', 'ASC')
      .getMany() as (VehicleType & { vehicleCount: number })[];
  }

  async findOne(id: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
      relations: ['vehicles'],
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    return vehicleType;
  }

  async findByName(name: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { name: name.toLowerCase(), isActive: true },
      relations: ['vehicles'],
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with name '${name}' not found`);
    }

    return vehicleType;
  }

  async getVehiclesByType(id: string): Promise<{
    vehicleType: VehicleType;
    vehicles: Vehicle[];
    count: number;
  }> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    const vehicles = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .innerJoin('vehicle.vehicleTypes', 'vehicleType')
      .where('vehicleType.id = :id', { id })
      .getMany();

    return {
      vehicleType,
      vehicles,
      count: vehicles.length,
    };
  }

  async update(id: string, updateVehicleTypeDto: UpdateVehicleTypeDto): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({ where: { id } });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    // Check if new name conflicts with existing one (excluding current record)
    if (updateVehicleTypeDto.name) {
      const existingVehicleType = await this.vehicleTypeRepository.findOne({
        where: { name: updateVehicleTypeDto.name.toLowerCase() },
      });

      if (existingVehicleType && existingVehicleType.id !== id) {
        throw new ConflictException(`Vehicle type with name '${updateVehicleTypeDto.name}' already exists`);
      }

      updateVehicleTypeDto.name = updateVehicleTypeDto.name.toLowerCase();
    }

    await this.vehicleTypeRepository.update(id, updateVehicleTypeDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const vehicleType = await this.vehicleTypeRepository.findOne({ where: { id } });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    // Check if there are associated vehicles using the many-to-many relationship
    const vehicleCount = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .innerJoin('vehicle.vehicleTypes', 'vehicleType')
      .where('vehicleType.id = :id', { id })
      .getCount();

    if (vehicleCount > 0) {
      throw new BadRequestException(
        'Cannot delete vehicle type as it has associated vehicles. Consider deactivating instead.'
      );
    }

    await this.vehicleTypeRepository.remove(vehicleType);
  }

  async softDelete(id: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({ where: { id } });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    await this.vehicleTypeRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  async restore(id: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    await this.vehicleTypeRepository.update(id, { isActive: true });
    return this.findOne(id);
  }

  async getStats(): Promise<{ 
    total: number; 
    active: number; 
    inactive: number;
    mostUsed: Array<{ id: string; name: string; vehicleCount: number }>;
  }> {
    const total = await this.vehicleTypeRepository.count();
    const active = await this.vehicleTypeRepository.count({ where: { isActive: true } });
    const inactive = total - active;

    // Get most used vehicle types (top 5)
    const mostUsed = await this.vehicleTypeRepository
      .createQueryBuilder('vehicleType')
      .loadRelationCountAndMap('vehicleType.vehicleCount', 'vehicleType.vehicles')
      .orderBy('vehicleCount', 'DESC')
      .take(5)
      .getMany()
      .then(types => 
        types.map(type => ({
          id: type.id,
          name: type.name,
          vehicleCount: (type as any).vehicleCount || 0
        }))
      );

    return { total, active, inactive, mostUsed };
  }
}