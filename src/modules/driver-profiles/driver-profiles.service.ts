import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverProfile, DriverStatus } from '../../database/entities/driver-profile.entity';
import { Point, Repository } from 'typeorm';
import {
  CreateDriverProfileDto,
  DriverProfileResponseDto,
  DriverStatsResponseDto,
  UpdateDriverProfileDto,
} from './dto/driver-profile.dto';

// Create a proper interface for update data that matches TypeORM's requirements
interface UpdateDriverProfileData {
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleId?: string;
  isOnline?: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  currentLocation?: Point;
  rating?: number;
  totalRides?: number;
  status?: DriverStatus;
}

@Injectable()
export class DriverProfileService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepository: Repository<DriverProfile>,
  ) {}

  async createDriverProfile(createDto: CreateDriverProfileDto): Promise<DriverProfileResponseDto> {
    // Check if driver profile already exists for this user
    const existingProfile = await this.driverProfileRepository.findOne({
      where: { userId: createDto.userId },
    });

    if (existingProfile) {
      throw new ConflictException('Driver profile already exists for this user');
    }

    // Validate license expiry date
    const licenseExpiryDate = new Date(createDto.licenseExpiry);
    if (licenseExpiryDate <= new Date()) {
      throw new BadRequestException('License expiry date must be in the future');
    }

    const driverProfile = this.driverProfileRepository.create({
      ...createDto,
      licenseExpiry: licenseExpiryDate,
      currentLocation: this.createPointFromCoordinates(
        createDto.currentLatitude,
        createDto.currentLongitude,
      ),
    });

    const savedProfile = await this.driverProfileRepository.save(driverProfile);
    return this.mapToResponseDto(savedProfile);
  }

  async getDriverProfile(driverId: string): Promise<DriverProfileResponseDto> {
    console.log(driverId);
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
      relations: ['user', 'vehicle'],
    });
    console.log(driverProfile);
    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.mapToResponseDto(driverProfile);
  }

  async updateDriverProfile(
    driverId: string,
    updateDto: UpdateDriverProfileDto,
  ): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Validate license expiry if provided
    let processedLicenseExpiry: string | undefined;
    if (updateDto.licenseExpiry) {
      const licenseExpiryDate = new Date(updateDto.licenseExpiry);
      if (licenseExpiryDate <= new Date()) {
        throw new BadRequestException('License expiry date must be in the future');
      }
      processedLicenseExpiry = licenseExpiryDate.toISOString();
    }

    // Build update data with only the fields that should be updated
    const updateData: UpdateDriverProfileData = {};
    
    if (updateDto.licenseNumber !== undefined) {
      updateData.licenseNumber = updateDto.licenseNumber;
    }
    
    if (processedLicenseExpiry !== undefined) {
      updateData.licenseExpiry = processedLicenseExpiry;
    }
    
    if (updateDto.vehicleId !== undefined) {
      updateData.vehicleId = updateDto.vehicleId;
    }
    
    if (updateDto.isOnline !== undefined) {
      updateData.isOnline = updateDto.isOnline;
    }
    
    if (updateDto.rating !== undefined) {
      updateData.rating = updateDto.rating;
    }
    
    if (updateDto.totalRides !== undefined) {
      updateData.totalRides = updateDto.totalRides;
    }
    
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    // Update location if coordinates are provided
    if (updateDto.currentLatitude !== undefined && updateDto.currentLongitude !== undefined) {
      updateData.currentLatitude = updateDto.currentLatitude;
      updateData.currentLongitude = updateDto.currentLongitude;
      updateData.currentLocation = this.createPointFromCoordinates(
        updateDto.currentLatitude,
        updateDto.currentLongitude,
      );
    }

    await this.driverProfileRepository.update(driverId, updateData);

    const updatedProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
      relations: ['user', 'vehicle'],
    });

    return this.mapToResponseDto(updatedProfile!);
  }

  async updateDriverStatus(
    driverId: string,
    status: DriverStatus,
  ): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Update online status based on driver status
    const isOnline = status !== DriverStatus.OFFLINE;

    // Create proper update data
    const updateData: UpdateDriverProfileData = {
      status,
      isOnline,
    };

    // Use the actual profile ID for the update, not the userId
    await this.driverProfileRepository.update(driverProfile.id, updateData);

    // Find the updated profile using the profile ID
    const updatedProfile = await this.driverProfileRepository.findOne({
      where: { id: driverProfile.id },
      relations: ['user', 'vehicle'],
    });

    if (!updatedProfile) {
      throw new NotFoundException('Updated driver profile not found');
    }

    return this.mapToResponseDto(updatedProfile);
  }

  async setDriverOnline(driverId: string, isOnline: boolean): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Update status based on online state
    const status = isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;

    // Create proper update data
    const updateData: UpdateDriverProfileData = {
      isOnline,
      status,
    };

    // Fix: Use profile.id instead of driverId for the update
    await this.driverProfileRepository.update(driverProfile.id, updateData);

    const updatedProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
      relations: ['user', 'vehicle'],
    });

    return this.mapToResponseDto(updatedProfile!);
  }

  async getDriverStats(driverId: string): Promise<DriverStatsResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
      relations: ['user'],
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // TODO: Add additional stats calculations from ride history
    // This would typically involve joining with rides table for more detailed stats
    return {
      driverId: driverProfile.id,
      totalRides: driverProfile.totalRides,
      rating: driverProfile.rating,
      isOnline: driverProfile.isOnline,
      status: driverProfile.status,
      joinDate: driverProfile.createdAt,
      // These would be calculated from ride history
      totalEarnings: 0,
      completedRides: driverProfile.totalRides,
      cancelledRides: 0,
      averageRideTime: 0,
    };
  }

  async assignVehicle(driverId: string, vehicleId: string): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    const updateData: UpdateDriverProfileData = { vehicleId };
    await this.driverProfileRepository.update(driverId, updateData);

    const updatedProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
      relations: ['user', 'vehicle'],
    });

    return this.mapToResponseDto(updatedProfile!);
  }

  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    const updateData: UpdateDriverProfileData = {
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentLocation: this.createPointFromCoordinates(latitude, longitude),
    };

    await this.driverProfileRepository.update(driverId, updateData);
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusInKm = 5,
    limit = 10,
  ): Promise<DriverProfileResponseDto[]> {
    const query = this.driverProfileRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.isOnline = :isOnline', { isOnline: true })
      .andWhere('driver.status = :status', { status: DriverStatus.ONLINE })
      .andWhere('driver.currentLocation IS NOT NULL')
      .andWhere(
        'ST_DWithin(driver.current_location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)',
        {
          latitude,
          longitude,
          radius: radiusInKm * 1000, // Convert km to meters
        },
      )
      .orderBy(
        'ST_Distance(driver.current_location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)',
      )
      .setParameters({ latitude, longitude })
      .limit(limit);

    const drivers = await query.getMany();
    return drivers.map(driver => this.mapToResponseDto(driver));
  }

  private createPointFromCoordinates(latitude?: number, longitude?: number): Point | undefined {
    if (!latitude || !longitude) {
      return undefined;
    }

    // Return Point object that TypeORM can handle
    return {
      type: 'Point',
      coordinates: [longitude, latitude],
    } as Point;
  }

  private mapToResponseDto(driverProfile: DriverProfile): DriverProfileResponseDto {
    return {
      id: driverProfile.id,
      userId: driverProfile.userId,
      licenseNumber: driverProfile.licenseNumber,
      licenseExpiry: driverProfile.licenseExpiry,
      vehicleId: driverProfile.vehicleId,
      isOnline: driverProfile.isOnline,
      currentLatitude: driverProfile.currentLatitude,
      currentLongitude: driverProfile.currentLongitude,
      rating: driverProfile.rating,
      totalRides: driverProfile.totalRides,
      status: driverProfile.status,
      createdAt: driverProfile.createdAt,
      user: driverProfile.user
        ? {
            id: driverProfile.user.id,
            firstName: driverProfile.user.firstName,
            lastName: driverProfile.user.lastName,
            email: driverProfile.user.email,
            phoneNumber: driverProfile.user.phone,
          }
        : undefined,
      vehicle: driverProfile.vehicle
        ? {
            id: driverProfile.vehicle.id,
            make: driverProfile.vehicle.make,
            model: driverProfile.vehicle.model,
            year: driverProfile.vehicle.year,
            licensePlate: driverProfile.vehicle.licensePlate,
            color: driverProfile.vehicle.color,
          }
        : undefined,
    };
  }
}