import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
  ChangePasswordDto,
  UserProfileResponseDto,
} from './dto/users.dto';
import { User } from 'src/database/entities/user.entity';
import { UserType } from 'src/common/enums/user-types.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createDto: CreateUserDto): Promise<User> {
    // Check if user already exists with email or phone
    const existingUser = await this.userRepository.findOne({
        where: [
        { email: createDto.email },
        { phone: createDto.phone },
        ],
    });

    if (existingUser) {
        if (existingUser.email === createDto.email) {
        throw new ConflictException('User with this email already exists');
        }
        if (existingUser.phone === createDto.phone) {
        throw new ConflictException('User with this phone number already exists');
        }
    }

    try {
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(createDto.password, saltRounds);

        const user = this.userRepository.create({
        email: createDto.email,
        phone: createDto.phone,
        passwordHash: hashedPassword,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        profilePictureUrl: createDto.profilePictureUrl,
        userType: createDto.userType,
        isVerified: createDto.isVerified ?? false,
        isActive: createDto.isActive ?? true,
        });

        const savedUser = await this.userRepository.save(user);
        this.logger.log(`Created user: ${savedUser.id}`);

        // Remove password hash from response
        const { passwordHash, ...userResponse } = savedUser;
        return userResponse as User;
    } catch (error) {
        this.logger.error('Failed to create user', error.stack);
        throw new BadRequestException('Failed to create user');
    }
  }

  async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async getUsers(filterDto: UserFilterDto): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.phone',
        'user.firstName',
        'user.lastName',
        'user.profilePictureUrl',
        'user.userType',
        'user.isVerified',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply filters
    if (filterDto.userType) {
      queryBuilder.andWhere('user.userType = :userType', {
        userType: filterDto.userType,
      });
    }

    if (filterDto.isVerified !== undefined) {
      queryBuilder.andWhere('user.isVerified = :isVerified', {
        isVerified: filterDto.isVerified,
      });
    }

    if (filterDto.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filterDto.isActive,
      });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    // Add pagination
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Add sorting
    const sortBy = filterDto.sortBy || 'createdAt';
    const sortOrder = filterDto.sortOrder || 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.getUser(userId);

    // Check for email/phone conflicts if they're being updated
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (updateDto.phone && updateDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateDto.phone },
      });
      if (existingUser) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    try {
      await this.userRepository.update(userId, updateDto);
      const updatedUser = await this.getUser(userId);
      this.logger.log(`Updated user: ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', error.stack);
      throw new BadRequestException('Failed to update user');
    }
  }

  async verifyUser(userId: string): Promise<User> {
    const user = await this.getUser(userId);

    await this.userRepository.update(userId, { isVerified: true });
    this.logger.log(`Verified user: ${userId}`);

    return { ...user, isVerified: true };
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.getUser(userId);

    await this.userRepository.update(userId, { isActive: true });
    this.logger.log(`Activated user: ${userId}`);

    return { ...user, isActive: true };
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.getUser(userId);

    await this.userRepository.update(userId, { isActive: false });
    this.logger.log(`Deactivated user: ${userId}`);

    return { ...user, isActive: false };
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async getUserByPhone(phone: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { phone },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with phone ${phone} not found`);
    }

    return user;
  }

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'driverProfile',
        'ridesAsRider',
        'ridesAsDriver',
        'payments',
        'ratingsReceived',
      ],
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Calculate user statistics
    const stats = {
      totalRidesAsRider: user.ridesAsRider?.length || 0,
      totalRidesAsDriver: user.ridesAsDriver?.length || 0,
      averageRatingAsRider: this.calculateAverageRating(
        user.ratingsReceived?.filter(r => r.ratedBy.userType === 'rider') || []
      ),
      averageRatingAsDriver: this.calculateAverageRating(
        user.ratingsReceived?.filter(r => r.ratedUser.userType === 'driver') || []
      ),
      totalPayments: user.payments?.length || 0,
    };

    return {
      ...user,
      stats,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);

    // Soft delete by deactivating the user
    await this.userRepository.update(userId, { isActive: false });
    this.logger.log(`Soft deleted user: ${userId}`);
  }

  // Authentication helper methods
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'isActive', 'isVerified'],
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result as User;
  }

  async getUserForAuth(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'userType',
        'isVerified',
        'isActive',
      ],
    });
  }

  // Helper methods
  private calculateAverageRating(ratings: any[]): number {
    if (!ratings || ratings.length === 0) return 0;
    
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updateData: Partial<UpdateUserDto>): Promise<void> {
    await this.userRepository.update(userIds, updateData);
    this.logger.log(`Bulk updated ${userIds.length} users`);
  }

  async getUsersByType(userType: UserType): Promise<User[]> {
    return this.userRepository.find({
      where: { userType, isActive: true },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async getRecentUsers(limit: number = 10): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'profilePictureUrl',
        'userType',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }
}