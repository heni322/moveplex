import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverProfile, DriverStatus } from 'src/database/entities/driver-profile.entity';
import { Point, Repository } from 'typeorm';
import { CreateDriverProfileDto, DriverProfileResponseDto, DriverStatsResponseDto, UpdateDriverProfileDto } from './dto/driver-profile.dto';

@Injectable()
export class DriverProfileService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepository: Repository<DriverProfile>,
  ) {}

  async createDriverProfile(
    createDto: CreateDriverProfileDto,
  ): Promise<DriverProfileResponseDto> {
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
    if (updateDto.licenseExpiry) {
      const licenseExpiryDate = new Date(updateDto.licenseExpiry);
      if (licenseExpiryDate <= new Date()) {
        throw new BadRequestException('License expiry date must be in the future');
      }
      updateDto.licenseExpiry = licenseExpiryDate.toISOString();
    }

    // Update location if coordinates are provided
    let updateData: any = { ...updateDto };
    if (updateDto.currentLatitude && updateDto.currentLongitude) {
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

    // Use the actual profile ID for the update, not the userId
    await this.driverProfileRepository.update(driverProfile.id, {
      status,
      isOnline,
    });

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

  async setDriverOnline(
    driverId: string,
    isOnline: boolean,
  ): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Update status based on online state
    const status = isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;

    await this.driverProfileRepository.update(driverId, {
      isOnline,
      status,
    });

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

  async assignVehicle(
    driverId: string,
    vehicleId: string,
  ): Promise<DriverProfileResponseDto> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    await this.driverProfileRepository.update(driverId, { vehicleId });

    const updatedProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
      relations: ['user', 'vehicle'],
    });

    return this.mapToResponseDto(updatedProfile!);
  }

  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { id: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    await this.driverProfileRepository.update(driverId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentLocation: this.createPointFromCoordinates(latitude, longitude),
    });
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusInKm: number = 5,
    limit: number = 10,
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

  private createPointFromCoordinates(
    latitude?: number,
    longitude?: number,
  ): Point | undefined {
    if (!latitude || !longitude) {
      return undefined;
    }
    
    // Return Point object that TypeORM can handle
    return {
      type: 'Point',
      coordinates: [longitude, latitude]
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
      user: driverProfile.user ? {
        id: driverProfile.user.id,
        firstName: driverProfile.user.firstName,
        lastName: driverProfile.user.lastName,
        email: driverProfile.user.email,
        phoneNumber: driverProfile.user.phone,
      } : undefined,
      vehicle: driverProfile.vehicle ? {
        id: driverProfile.vehicle.id,
        make: driverProfile.vehicle.make,
        model: driverProfile.vehicle.model,
        year: driverProfile.vehicle.year,
        licensePlate: driverProfile.vehicle.licensePlate,
        color: driverProfile.vehicle.color,
      } : undefined,
    };
  }
}