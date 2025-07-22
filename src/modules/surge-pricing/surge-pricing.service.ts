import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UpdateSurgePricingDto,
  SurgePricingFilterDto,
  LocationSurgeResponseDto,
  CreateSurgePricingDto,
} from './dto/surge-pricing.dto';
import { SurgePricing } from 'src/database/entities/surge-pricing.entity';

@Injectable()
export class SurgePricingService {
  private readonly logger = new Logger(SurgePricingService.name);

  constructor(
    @InjectRepository(SurgePricing)
    private readonly surgePricingRepository: Repository<SurgePricing>,
  ) {}

  async createSurgeArea(createDto: CreateSurgePricingDto): Promise<SurgePricing> {
    try {
      // Convert coordinates array to PostGIS POLYGON format
      const polygonWKT = this.coordinatesToPolygonWKT(createDto.coordinates);

      const surgeArea = this.surgePricingRepository.create({
        areaName: createDto.areaName,
        area: polygonWKT,
        multiplier: createDto.multiplier,
        startsAt: new Date(createDto.startsAt),
        endsAt: createDto.endsAt ? new Date(createDto.endsAt) : undefined,
        isActive: createDto.isActive ?? true,
        metadata: createDto.metadata,
      });

      const savedSurgeArea = await this.surgePricingRepository.save(surgeArea);
      this.logger.log(`Created surge area: ${savedSurgeArea.id}`);

      return savedSurgeArea;
    } catch (error) {
      this.logger.error('Failed to create surge area', error.stack);
      throw new BadRequestException('Failed to create surge area');
    }
  }

  async getSurgeArea(surgeId: string): Promise<SurgePricing> {
    const surgeArea = await this.surgePricingRepository.findOne({
      where: { id: surgeId },
    });

    if (!surgeArea) {
      throw new NotFoundException(`Surge area with ID ${surgeId} not found`);
    }

    return surgeArea;
  }

  async getSurgeAreas(filterDto: SurgePricingFilterDto): Promise<{
    data: SurgePricing[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.surgePricingRepository.createQueryBuilder('sp');

    // Apply filters
    if (filterDto.isActive !== undefined) {
      queryBuilder.andWhere('sp.isActive = :isActive', {
        isActive: filterDto.isActive,
      });
    }

    if (filterDto.areaName) {
      queryBuilder.andWhere('sp.areaName ILIKE :areaName', {
        areaName: `%${filterDto.areaName}%`,
      });
    }

    if (filterDto.minMultiplier) {
      queryBuilder.andWhere('sp.multiplier >= :minMultiplier', {
        minMultiplier: filterDto.minMultiplier,
      });
    }

    if (filterDto.maxMultiplier) {
      queryBuilder.andWhere('sp.multiplier <= :maxMultiplier', {
        maxMultiplier: filterDto.maxMultiplier,
      });
    }

    if (filterDto.startDate) {
      queryBuilder.andWhere('sp.startsAt >= :startDate', {
        startDate: new Date(filterDto.startDate),
      });
    }

    if (filterDto.endDate) {
      queryBuilder.andWhere(
        '(sp.endsAt IS NULL OR sp.endsAt <= :endDate)',
        {
          endDate: new Date(filterDto.endDate),
        },
      );
    }

    // Add pagination
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);
    queryBuilder.orderBy('sp.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateSurgeArea(
    surgeId: string,
    updateDto: UpdateSurgePricingDto,
  ): Promise<SurgePricing> {
    const surgeArea = await this.getSurgeArea(surgeId);

    try {
      const updateData: Partial<SurgePricing> = {
        ...updateDto,
        startsAt: updateDto.startsAt ? new Date(updateDto.startsAt) : undefined,
        endsAt: updateDto.endsAt ? new Date(updateDto.endsAt) : undefined,
      };

      // Handle polygon coordinates update
      if (updateDto.coordinates) {
        updateData.area = this.coordinatesToPolygonWKT(updateDto.coordinates);
      }

      await this.surgePricingRepository.update(surgeId, updateData);

      const updatedSurgeArea = await this.getSurgeArea(surgeId);
      this.logger.log(`Updated surge area: ${surgeId}`);

      return updatedSurgeArea;
    } catch (error) {
      this.logger.error('Failed to update surge area', error.stack);
      throw new BadRequestException('Failed to update surge area');
    }
  }

  async deleteSurgeArea(surgeId: string): Promise<void> {
    const surgeArea = await this.getSurgeArea(surgeId);

    await this.surgePricingRepository.delete(surgeId);
    this.logger.log(`Deleted surge area: ${surgeId}`);
  }

  async activateSurgeArea(surgeId: string): Promise<SurgePricing> {
    const surgeArea = await this.getSurgeArea(surgeId);

    await this.surgePricingRepository.update(surgeId, { isActive: true });
    this.logger.log(`Activated surge area: ${surgeId}`);

    return { ...surgeArea, isActive: true };
  }

  async deactivateSurgeArea(surgeId: string): Promise<SurgePricing> {
    const surgeArea = await this.getSurgeArea(surgeId);

    await this.surgePricingRepository.update(surgeId, { isActive: false });
    this.logger.log(`Deactivated surge area: ${surgeId}`);

    return { ...surgeArea, isActive: false };
  }

  async getSurgeMultiplierAtLocation(
    latitude: number,
    longitude: number,
  ): Promise<LocationSurgeResponseDto> {
    try {
      const point = `POINT(${longitude} ${latitude})`;
      const currentTime = new Date();

      // Query for active surge areas that contain the given point
      const activeSurgeAreas = await this.surgePricingRepository
        .createQueryBuilder('sp')
        .where('sp.isActive = true')
        .andWhere('sp.startsAt <= :currentTime', { currentTime })
        .andWhere('(sp.endsAt IS NULL OR sp.endsAt > :currentTime)', {
          currentTime,
        })
        .andWhere('ST_Contains(sp.area::geometry, ST_GeogFromText(:point))', {
          point,
        })
        .orderBy('sp.multiplier', 'DESC') // Get highest multiplier first
        .getMany();

      if (activeSurgeAreas.length === 0) {
        return {
          inSurgeArea: false,
          multiplier: 1.0,
          surgeAreas: [],
        };
      }

      // Use the highest multiplier if multiple surge areas overlap
      const highestMultiplier = Math.max(
        ...activeSurgeAreas.map((area) => Number(area.multiplier)),
      );

      return {
        inSurgeArea: true,
        multiplier: highestMultiplier,
        surgeAreas: activeSurgeAreas,
      };
    } catch (error) {
      this.logger.error('Failed to check surge at location', error.stack);
      throw new BadRequestException('Failed to check surge at location');
    }
  }

  async getActiveSurgeAreas(): Promise<SurgePricing[]> {
    const currentTime = new Date();

    return this.surgePricingRepository
      .createQueryBuilder('sp')
      .where('sp.isActive = true')
      .andWhere('sp.startsAt <= :currentTime', { currentTime })
      .andWhere('(sp.endsAt IS NULL OR sp.endsAt > :currentTime)', {
        currentTime,
      })
      .orderBy('sp.multiplier', 'DESC')
      .getMany();
  }

  /**
   * Converts coordinate array to PostGIS POLYGON WKT format
   */
  private coordinatesToPolygonWKT(coordinates: number[][]): string {
    if (coordinates.length < 4) {
      throw new BadRequestException(
        'Polygon must have at least 4 coordinate pairs',
      );
    }

    // Ensure polygon is closed (first and last points are the same)
    const lastPoint = coordinates[coordinates.length - 1];
    const firstPoint = coordinates[0];
    
    if (lastPoint[0] !== firstPoint[0] || lastPoint[1] !== firstPoint[1]) {
      coordinates.push([firstPoint[0], firstPoint[1]]);
    }

    // Convert coordinates to WKT format: POLYGON((lng1 lat1, lng2 lat2, ...))
    const coordinateString = coordinates
      .map((coord) => `${coord[0]} ${coord[1]}`)
      .join(', ');

    return `POLYGON((${coordinateString}))`;
  }

  /**
   * Bulk create surge areas (useful for seeding or batch operations)
   */
  async bulkCreateSurgeAreas(
    createDtos: CreateSurgePricingDto[],
  ): Promise<SurgePricing[]> {
    const surgeAreas = createDtos.map((dto) => {
      const polygonWKT = this.coordinatesToPolygonWKT(dto.coordinates);

      return this.surgePricingRepository.create({
        areaName: dto.areaName,
        area: polygonWKT,
        multiplier: dto.multiplier,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata,
      });
    });

    const savedSurgeAreas = await this.surgePricingRepository.save(surgeAreas);
    this.logger.log(`Bulk created ${savedSurgeAreas.length} surge areas`);

    return savedSurgeAreas;
  }

  /**
   * Get surge areas within a bounding box
   */
  async getSurgeAreasInBounds(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): Promise<SurgePricing[]> {
    const boundingBox = `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;

    return this.surgePricingRepository
      .createQueryBuilder('sp')
      .where('sp.isActive = true')
      .andWhere('ST_Intersects(sp.area::geometry, ST_GeogFromText(:bbox))', {
        bbox: boundingBox,
      })
      .getMany();
  }
}