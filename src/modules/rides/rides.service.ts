import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';

import {
  CreateRideDto,
  RideFilterDto,
  NearbyRidesDto,
  RideResponseDto,
  PaginatedRidesResponseDto,
  RideStatsDto,
} from './dto/rides.dto';
import { Ride, RideStatus } from '../../database/entities/ride.entity';
import { User } from '../../database/entities/user.entity';
import { RideTracking } from '../../database/entities/ride-tracking.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RideTracking)
    private readonly rideTrackingRepository: Repository<RideTracking>,
  ) {}

  async createRide(createRideDto: CreateRideDto): Promise<RideResponseDto> {
    // Verify rider exists
    const rider = await this.userRepository.findOne({
      where: { id: createRideDto.riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Check if rider has any pending rides
    const existingRide = await this.rideRepository.findOne({
      where: {
        riderId: createRideDto.riderId,
        status: In([
          RideStatus.REQUESTED,
          RideStatus.ACCEPTED,
          RideStatus.DRIVER_ARRIVING,
          RideStatus.IN_PROGRESS,
        ]),
      },
    });

    if (existingRide) {
      throw new ConflictException('Rider already has an active ride');
    }

    // Create pickup and destination location points
    const pickupLocation = `POINT(${createRideDto.pickupLongitude} ${createRideDto.pickupLatitude})`;
    const destinationLocation = `POINT(${createRideDto.destinationLongitude} ${createRideDto.destinationLatitude})`;

    const ride = this.rideRepository.create({
      ...createRideDto,
      pickupLocation,
      destinationLocation,
      status: RideStatus.REQUESTED,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(savedRide);
  }

  async getRide(rideId: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider', 'driver'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return this.mapToResponseDto(ride);
  }

  async getRides(filterDto: RideFilterDto): Promise<PaginatedRidesResponseDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'requestedAt',
      sortOrder = 'DESC',
      ...filters
    } = filterDto;

    const queryBuilder = this.rideRepository
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.rider', 'rider')
      .leftJoinAndSelect('ride.driver', 'driver');

    // Apply filters
    if (filters.riderId) {
      queryBuilder.andWhere('ride.riderId = :riderId', { riderId: filters.riderId });
    }

    if (filters.driverId) {
      queryBuilder.andWhere('ride.driverId = :driverId', { driverId: filters.driverId });
    }

    if (filters.status) {
      queryBuilder.andWhere('ride.status = :status', { status: filters.status });
    }

    if (filters.rideType) {
      queryBuilder.andWhere('ride.rideType = :rideType', { rideType: filters.rideType });
    }

    if (filters.paymentStatus) {
      queryBuilder.andWhere('ride.paymentStatus = :paymentStatus', {
        paymentStatus: filters.paymentStatus,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('ride.requestedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`ride.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [rides, total] = await queryBuilder.getManyAndCount();

    return {
      rides: rides.map(ride => this.mapToResponseDto(ride)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async acceptRide(rideId: string, driverId: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.REQUESTED) {
      throw new BadRequestException('Ride is not available for acceptance');
    }

    // Verify driver exists
    const driver = await this.userRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Check if driver has any active rides
    const existingDriverRide = await this.rideRepository.findOne({
      where: {
        driverId,
        status: In([RideStatus.ACCEPTED, RideStatus.DRIVER_ARRIVING, RideStatus.IN_PROGRESS]),
      },
    });

    if (existingDriverRide) {
      throw new ConflictException('Driver already has an active ride');
    }

    ride.driverId = driverId;
    ride.status = RideStatus.ACCEPTED;
    ride.acceptedAt = new Date();

    const updatedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(updatedRide);
  }

  async startRide(rideId: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider', 'driver'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.ACCEPTED && ride.status !== RideStatus.DRIVER_ARRIVING) {
      throw new BadRequestException('Ride cannot be started');
    }

    ride.status = RideStatus.IN_PROGRESS;
    ride.startedAt = new Date();

    const updatedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(updatedRide);
  }

  async completeRide(rideId: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider', 'driver'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new BadRequestException('Ride is not in progress');
    }

    ride.status = RideStatus.COMPLETED;
    ride.completedAt = new Date();

    const updatedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(updatedRide);
  }

  async cancelRide(rideId: string, reason?: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider', 'driver'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('Ride cannot be cancelled');
    }

    ride.status = RideStatus.CANCELLED;
    ride.cancelledAt = new Date();

    const updatedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(updatedRide);
  }

  async updateRideStatus(rideId: string, status: RideStatus): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['rider', 'driver'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Validate status transitions
    if (!this.isValidStatusTransition(ride.status, status)) {
      throw new BadRequestException(`Invalid status transition from ${ride.status} to ${status}`);
    }

    ride.status = status;

    // Update timestamps based on status
    switch (status) {
      case RideStatus.ACCEPTED:
        ride.acceptedAt = new Date();
        break;
      case RideStatus.IN_PROGRESS:
        ride.startedAt = new Date();
        break;
      case RideStatus.COMPLETED:
        ride.completedAt = new Date();
        break;
      case RideStatus.CANCELLED:
        ride.cancelledAt = new Date();
        break;
    }

    const updatedRide = await this.rideRepository.save(ride);
    return this.mapToResponseDto(updatedRide);
  }

  async getRideTracking(rideId: string): Promise<RideTracking[]> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return this.rideTrackingRepository.find({
      where: { rideId },
      //   order: { timestamp: 'ASC' },
    });
  }

  async getRiderHistory(
    riderId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedRidesResponseDto> {
    const rider = await this.userRepository.findOne({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const offset = (page - 1) * limit;

    const [rides, total] = await this.rideRepository.findAndCount({
      where: { riderId },
      relations: ['driver'],
      order: { requestedAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      rides: rides.map(ride => this.mapToResponseDto(ride)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDriverHistory(
    driverId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedRidesResponseDto> {
    const driver = await this.userRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const offset = (page - 1) * limit;

    const [rides, total] = await this.rideRepository.findAndCount({
      where: { driverId },
      relations: ['rider'],
      order: { requestedAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      rides: rides.map(ride => this.mapToResponseDto(ride)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNearbyRides(nearbyDto: NearbyRidesDto): Promise<RideResponseDto[]> {
    const { latitude, longitude, radiusKm = 10, rideType } = nearbyDto;

    const queryBuilder = this.rideRepository
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.rider', 'rider')
      .where('ride.status = :status', { status: RideStatus.REQUESTED })
      .andWhere(
        `ST_DWithin(
          ride.pickup_location,
          ST_GeogFromText('POINT(:longitude :latitude)'),
          :radius
        )`,
        {
          longitude,
          latitude,
          radius: radiusKm * 1000, // Convert km to meters
        },
      );

    if (rideType) {
      queryBuilder.andWhere('ride.rideType = :rideType', { rideType });
    }

    queryBuilder.orderBy(
      `ST_Distance(
        ride.pickup_location,
        ST_GeogFromText('POINT(:longitude :latitude)')
      )`,
      'ASC',
    );

    const rides = await queryBuilder.getMany();
    return rides.map(ride => this.mapToResponseDto(ride));
  }

  async getRideStats(userId: string, isDriver: boolean = false): Promise<RideStatsDto> {
    const whereCondition = isDriver ? { driverId: userId } : { riderId: userId };

    const [totalRides, completedRides, cancelledRides] = await Promise.all([
      this.rideRepository.count({ where: whereCondition }),
      this.rideRepository.count({
        where: { ...whereCondition, status: RideStatus.COMPLETED },
      }),
      this.rideRepository.count({
        where: { ...whereCondition, status: RideStatus.CANCELLED },
      }),
    ]);

    const statsQuery = await this.rideRepository
      .createQueryBuilder('ride')
      .select([
        'SUM(ride.fareAmount) as totalEarnings',
        'AVG(ride.distanceKm) as avgDistance',
        'SUM(ride.distanceKm) as totalDistance',
        'SUM(ride.durationMinutes) as totalDuration',
      ])
      .where(whereCondition)
      .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
      .getRawOne();

    return {
      totalRides,
      completedRides,
      cancelledRides,
      totalEarnings: parseFloat(statsQuery.totalEarnings) || 0,
      averageRating: 0, // This would require joining with ratings table
      totalDistance: parseFloat(statsQuery.totalDistance) || 0,
      totalDuration: parseInt(statsQuery.totalDuration) || 0,
    };
  }

  private isValidStatusTransition(from: RideStatus, to: RideStatus): boolean {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.REQUESTED]: [RideStatus.ACCEPTED, RideStatus.CANCELLED],
      [RideStatus.ACCEPTED]: [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ARRIVING]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private mapToResponseDto(ride: Ride): RideResponseDto {
    return {
      id: ride.id,
      riderId: ride.riderId,
      driverId: ride.driverId,
      pickupLatitude: ride.pickupLatitude,
      pickupLongitude: ride.pickupLongitude,
      pickupAddress: ride.pickupAddress,
      destinationLatitude: ride.destinationLatitude,
      destinationLongitude: ride.destinationLongitude,
      destinationAddress: ride.destinationAddress,
      rideType: ride.rideType,
      status: ride.status,
      fareAmount: ride.fareAmount,
      distanceKm: ride.distanceKm,
      durationMinutes: ride.durationMinutes,
      paymentStatus: ride.paymentStatus,
      requestedAt: ride.requestedAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      rider: ride.rider
        ? {
            id: ride.rider.id,
            firstName: ride.rider.firstName,
            lastName: ride.rider.lastName,
            phone: ride.rider.phone,
            // rating: ride.rider.rating || 0,
          }
        : undefined,
      driver: ride.driver
        ? {
            id: ride.driver.id,
            firstName: ride.driver.firstName,
            lastName: ride.driver.lastName,
            phone: ride.driver.phone,
            // rating: ride.driver.rating || 0,
            // vehicle: ride.driver.vehicle ? {
            //   make: ride.driver.vehicle.make,
            //   model: ride.driver.vehicle.model,
            //   licensePlate: ride.driver.vehicle.licensePlate,
            //   color: ride.driver.vehicle.color,
            // } : undefined,
          }
        : undefined,
    };
  }
}
