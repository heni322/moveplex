import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RatingReview } from '../../database/entities/rating-review.entity';
import { Repository } from 'typeorm';
import {
  CreateRatingDto,
  DriverRatingStatsDto,
  RatingFilterDto,
  RatingHistoryResponseDto,
  RatingResponseDto,
  RatingStatsDto,
  UserAverageRatingDto,
} from './dto/ratings.dto';

// Type definitions for raw query results
interface AverageRatingResult {
  average: string | null;
}

interface CountResult {
  total: string;
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(RatingReview)
    private readonly ratingRepository: Repository<RatingReview>,
  ) {}

  async createRating(createDto: CreateRatingDto): Promise<RatingResponseDto> {
    // Check if rating already exists for this ride and rater
    const existingRating = await this.ratingRepository.findOne({
      where: {
        rideId: createDto.rideId,
        ratedById: createDto.ratedById,
        ratedUserId: createDto.ratedUserId,
      },
    });

    if (existingRating) {
      throw new ConflictException('Rating already exists for this ride and user combination');
    }

    // Validate that user is not rating themselves
    if (createDto.ratedById === createDto.ratedUserId) {
      throw new BadRequestException('Users cannot rate themselves');
    }

    try {
      const rating = this.ratingRepository.create(createDto);
      const savedRating = await this.ratingRepository.save(rating);
      return this.mapToResponseDto(savedRating);
    } catch {
      throw new InternalServerErrorException('Failed to create rating');
    }
  }

  async getRating(ratingId: string): Promise<RatingResponseDto> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
      relations: ['ratedBy', 'ratedUser', 'ride'],
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    return this.mapToResponseDto(rating);
  }

  async getRatings(filterDto: RatingFilterDto): Promise<RatingHistoryResponseDto> {
    const {
      rideId,
      ratedById,
      ratedUserId,
      minRating,
      maxRating,
      startDate,
      endDate,
      tag,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.ratedBy', 'ratedBy')
      .leftJoinAndSelect('rating.ratedUser', 'ratedUser')
      .leftJoinAndSelect('rating.ride', 'ride');

    // Apply filters
    if (rideId) {
      queryBuilder.andWhere('rating.rideId = :rideId', { rideId });
    }

    if (ratedById) {
      queryBuilder.andWhere('rating.ratedById = :ratedById', { ratedById });
    }

    if (ratedUserId) {
      queryBuilder.andWhere('rating.ratedUserId = :ratedUserId', { ratedUserId });
    }

    if (minRating) {
      queryBuilder.andWhere('rating.rating >= :minRating', { minRating });
    }

    if (maxRating) {
      queryBuilder.andWhere('rating.rating <= :maxRating', { maxRating });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('rating.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('rating.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('rating.createdAt <= :endDate', { endDate });
    }

    if (tag) {
      queryBuilder.andWhere('rating.tags @> :tag', { tag: JSON.stringify([tag]) });
    }

    // Apply sorting
    queryBuilder.orderBy(`rating.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [ratings, total] = await queryBuilder.getManyAndCount();

    // Calculate average rating for the filtered results
    const avgResult = (await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where(queryBuilder.getQuery().split('FROM')[1].split('ORDER BY')[0])
      .setParameters(queryBuilder.getParameters())
      .getRawOne()) as AverageRatingResult;

    const averageRating = Number(avgResult.average) || 0;

    return {
      ratings: ratings.map(rating => this.mapToResponseDto(rating)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }

  async getRideRatings(rideId: string): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingRepository.find({
      where: { rideId },
      relations: ['ratedBy', 'ratedUser'],
      order: { createdAt: 'DESC' },
    });

    return ratings.map(rating => this.mapToResponseDto(rating));
  }

  async getUserRatingsReceived(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<RatingHistoryResponseDto> {
    const skip = (page - 1) * limit;

    const [ratings, total] = await this.ratingRepository.findAndCount({
      where: { ratedUserId: userId },
      relations: ['ratedBy', 'ride'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Calculate average rating
    const avgResult = (await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where('rating.ratedUserId = :userId', { userId })
      .getRawOne()) as AverageRatingResult;

    const averageRating = Number(avgResult.average) || 0;

    return {
      ratings: ratings.map(rating => this.mapToResponseDto(rating)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }

  async getUserRatingsGiven(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<RatingHistoryResponseDto> {
    const skip = (page - 1) * limit;

    const [ratings, total] = await this.ratingRepository.findAndCount({
      where: { ratedById: userId },
      relations: ['ratedUser', 'ride'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Calculate average rating given
    const avgResult = (await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .where('rating.ratedById = :userId', { userId })
      .getRawOne()) as AverageRatingResult;

    const averageRating = Number(avgResult.average) || 0;

    return {
      ratings: ratings.map(rating => this.mapToResponseDto(rating)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }

  async getUserAverageRating(userId: string): Promise<UserAverageRatingDto> {
    const [avgResult, totalResult, recentRatings] = await Promise.all([
      this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .where('rating.ratedUserId = :userId', { userId })
        .getRawOne() as Promise<AverageRatingResult>,
      this.ratingRepository
        .createQueryBuilder('rating')
        .select('COUNT(*)', 'total')
        .where('rating.ratedUserId = :userId', { userId })
        .getRawOne() as Promise<CountResult>,
      this.ratingRepository.find({
        where: { ratedUserId: userId },
        relations: ['ratedBy'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const averageRating = Number(avgResult.average) || 0;
    const totalRatings = Number(totalResult.total) || 0;

    return {
      userId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
      recentRatings: recentRatings.map(rating => this.mapToResponseDto(rating)),
    };
  }

  async getDriverRatingStats(driverId: string): Promise<DriverRatingStatsDto> {
    const [basicStats, monthlyStats, recentReviews] = await Promise.all([
      this.getRatingStats(driverId),
      this.getMonthlyRatingStats(driverId),
      this.getRecentReviews(driverId),
    ]);

    return {
      ...basicStats,
      userId: driverId,
      monthlyStats,
      recentReviews,
    };
  }

  private async getRatingStats(userId: string): Promise<RatingStatsDto> {
    const ratings = await this.ratingRepository.find({
      where: { ratedUserId: userId },
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        topTags: [],
      };
    }

    // Calculate average
    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = Math.round((total / ratings.length) * 10) / 10;

    // Calculate distribution
    const distribution: { [key: string]: number } = {};
    ratings.forEach(rating => {
      const key = Math.floor(rating.rating).toString();
      distribution[key] = (distribution[key] || 0) + 1;
    });

    // Calculate top tags
    const tagCounts: { [key: string]: number } = {};
    ratings.forEach(rating => {
      if (rating.tags) {
        rating.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageRating,
      totalRatings: ratings.length,
      ratingDistribution: distribution,
      topTags,
    };
  }

  private async getMonthlyRatingStats(userId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    interface MonthlyStatsResult {
      month: string;
      averageRating: string;
      totalRatings: string;
    }

    const monthlyData = await this.ratingRepository
      .createQueryBuilder('rating')
      .select("DATE_TRUNC('month', rating.createdAt)", 'month')
      .addSelect('AVG(rating.rating)', 'averageRating')
      .addSelect('COUNT(*)', 'totalRatings')
      .where('rating.ratedUserId = :userId', { userId })
      .andWhere('rating.createdAt >= :sixMonthsAgo', { sixMonthsAgo })
      .groupBy("DATE_TRUNC('month', rating.createdAt)")
      .orderBy('month', 'DESC')
      .getRawMany();

    return monthlyData.map((data: MonthlyStatsResult) => ({
      month: data.month,
      averageRating: Math.round(Number(data.averageRating) * 10) / 10,
      totalRatings: Number(data.totalRatings),
    }));
  }

  private async getRecentReviews(userId: string) {
    const ratings = await this.ratingRepository.find({
      where: { ratedUserId: userId },
      relations: ['ratedBy'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return ratings
      .filter(rating => rating.review && rating.review.trim().length > 0)
      .map(rating => ({
        rating: rating.rating,
        review: rating.review!,
        ratedBy: `${rating.ratedBy?.firstName} ${rating.ratedBy?.lastName}`.trim(),
        createdAt: rating.createdAt,
      }));
  }

  // Helper method to map entity to response DTO
  private mapToResponseDto(rating: RatingReview): RatingResponseDto {
    return {
      id: rating.id,
      rideId: rating.rideId,
      ratedById: rating.ratedById,
      ratedUserId: rating.ratedUserId,
      rating: rating.rating,
      review: rating.review,
      tags: rating.tags,
      createdAt: rating.createdAt,
      ratedBy: rating.ratedBy
        ? {
            id: rating.ratedBy.id,
            firstName: rating.ratedBy.firstName,
            lastName: rating.ratedBy.lastName,
          }
        : undefined,
      ratedUser: rating.ratedUser
        ? {
            id: rating.ratedUser.id,
            firstName: rating.ratedUser.firstName,
            lastName: rating.ratedUser.lastName,
          }
        : undefined,
      ride: rating.ride
        ? {
            id: rating.ride.id,
            pickupLocation: rating.ride.pickupLocation,
            destinationLocation: rating.ride.destinationLocation,
          }
        : undefined,
    };
  }

  // Additional utility methods
  async getTopRatedUsers(limit: number = 10) {
    interface TopRatedUserResult {
      userId: string;
      averageRating: string;
      totalRatings: string;
    }

    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('rating.ratedUserId', 'userId')
      .addSelect('AVG(rating.rating)', 'averageRating')
      .addSelect('COUNT(*)', 'totalRatings')
      .groupBy('rating.ratedUserId')
      .having('COUNT(*) >= :minRatings', { minRatings: 5 })
      .orderBy('averageRating', 'DESC')
      .addOrderBy('totalRatings', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((data: TopRatedUserResult) => ({
      userId: data.userId,
      averageRating: Math.round(Number(data.averageRating) * 10) / 10,
      totalRatings: Number(data.totalRatings),
    }));
  }

  async canUserRate(rideId: string, ratedById: string, ratedUserId: string): Promise<boolean> {
    const existingRating = await this.ratingRepository.findOne({
      where: { rideId, ratedById, ratedUserId },
    });

    return !existingRating && ratedById !== ratedUserId;
  }
}
