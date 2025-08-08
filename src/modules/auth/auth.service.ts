import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/database/entities/user.entity';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';
import { UserType } from 'src/common/enums/user-types.enum';
import { AuthResponse } from 'src/common/interfaces/auth-response.interface';
import { TokenPayload } from 'src/common/interfaces/token-payload.interface';
import { RefreshToken } from 'src/database/entities/refresh-token.entity';
import { RefreshTokenDto } from 'src/common/dto/refresh-token.dto';
@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // Shorter access token
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly MAX_REFRESH_TOKENS = 5; // Limit concurrent sessions

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(DriverProfile)
    private driverRepository: Repository<DriverProfile>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, role, firstName, lastName, phone, license_number, license_expiry } = registerDto;

    // Check for existing users (combine into single query for better performance)
    const existingUsers = await this.userRepository.find({
      where: [{ email }, { phone }],
      select: ['id', 'email', 'phone']
    });

    if (existingUsers.some(user => user.email === email)) {
      throw new ConflictException('User with this email already exists');
    }
    
    if (existingUsers.some(user => user.phone === phone)) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Validate role-specific requirements
    if (role === UserType.DRIVER && (!license_number || !license_expiry)) {
      throw new ConflictException('License information is required for driver registration');
    }

    const passwordHash = await this.hashPassword(password);

    // Use transaction for atomic operations
    return await this.userRepository.manager.transaction(async manager => {
      const user = manager.create(User, {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        userType: role,
      });

      const savedUser = await manager.save(user);

      // Create role-specific profile
      if (role === UserType.DRIVER) {
        const driverProfile = manager.create(DriverProfile, {
          user: savedUser,
          licenseNumber: license_number as string,
          licenseExpiry: license_expiry as Date,
        });
        await manager.save(driverProfile);
      }

      return this.generateTokenPair(savedUser);
    });
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['driverProfile'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check for account lockout (implement if needed)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    const isPasswordValid = await this.validatePassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Implement failed login attempt tracking
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.resetFailedLoginAttempts(user.id);
    }

    // Clean up old refresh tokens before creating new ones
    await this.cleanupUserRefreshTokens(user.id);

    return this.generateTokenPair(user, userAgent, ipAddress);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const { refresh_token } = refreshTokenDto;

    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { 
        token: await this.hashRefreshToken(refresh_token),
        expiresAt: MoreThan(new Date()),
        isRevoked: false 
      },
      relations: ['user'],
    });

    if (!tokenRecord || !tokenRecord.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Update last used timestamp
    tokenRecord.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(tokenRecord);

    return this.generateTokenPair(tokenRecord.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const hashedToken = await this.hashRefreshToken(refreshToken);
    await this.refreshTokenRepository.update(
      { token: hashedToken },
      { isRevoked: true }
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId } },
      { isRevoked: true }
    );
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['driverProfile'],
      select: ['id', 'email', 'firstName', 'lastName', 'userType', 'isVerified', 'phone']
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async generateTokenPair(user: User, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.generateRefreshToken();
    const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

    // Store refresh token in database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: hashedRefreshToken,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isVerified: user.isVerified,
        driverProfile: user.driverProfile,
      },
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async cleanupUserRefreshTokens(userId: string): Promise<void> {
    // Remove expired tokens
    await this.refreshTokenRepository.delete({
      user: { id: userId },
      expiresAt: LessThan(new Date()),
    });

    // Limit concurrent sessions
    const activeTokens = await this.refreshTokenRepository.find({
      where: { user: { id: userId }, isRevoked: false },
      order: { createdAt: 'DESC' },
    });

    if (activeTokens.length >= this.MAX_REFRESH_TOKENS) {
      const tokensToRevoke = activeTokens.slice(this.MAX_REFRESH_TOKENS - 1);
      await this.refreshTokenRepository.update(
        { id: In(tokensToRevoke.map(t => t.id)) },
        { isRevoked: true }
      );
    }
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const maxAttempts = 5;
    const lockDuration = 15 * 60 * 1000; // 15 minutes

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    
    if (failedAttempts >= maxAttempts) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: failedAttempts,
        lockedUntil: new Date(Date.now() + lockDuration),
      });
    } else {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: failedAttempts,
      });
    }
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
  }
}
