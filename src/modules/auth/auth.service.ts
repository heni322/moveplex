import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserType } from 'src/database/entities/user.entity';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DriverProfile)
    private driverRepository: Repository<DriverProfile>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string; user: any }> {
    try {
      console.log('Register DTO:', registerDto);

      const { email, password, role, firstName, lastName, phone, license_number, license_expiry ,payment_method } = registerDto;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({ where: { email } });
      console.log('Checking existing user...');

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const existingUserByPhone = await this.userRepository.findOne({ where: { phone } });
      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      console.log('Hashing password...');

      // Create user
      const user = new User();
      user.email = email;
      user.phone = phone;
      user.passwordHash = passwordHash;
      user.firstName = firstName;
      user.lastName = lastName;
      user.userType = role;

      const savedUser = await this.userRepository.save(user);

      // Create role-specific profile
      if (role === UserType.DRIVER || role === UserType.BOTH) {
        const driverProfile = new DriverProfile();
        driverProfile.user = savedUser;
        driverProfile.licenseNumber = license_number as string;
        driverProfile.licenseExpiry = license_expiry as Date;
        // Set other driver-specific fields as needed
        await this.driverRepository.save(driverProfile);
      }

      // Note: Rider-specific data can be stored in the User entity or create a separate RiderProfile entity
      // For now, payment_method could be stored in User entity or handled separately

      const payload = { 
        sub: savedUser.id, 
        email: savedUser.email, 
        userType: savedUser.userType 
      };
      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          userType: savedUser.userType,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          phone: savedUser.phone,
          isVerified: savedUser.isVerified,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; user: any }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['driverProfile'],
    });

    if (!user || !(await this.validatePassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      userType: user.userType 
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
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

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['driverProfile'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}