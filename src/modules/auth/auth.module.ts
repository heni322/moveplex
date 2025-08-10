import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { DriverProfile } from '../../database/entities/driver-profile.entity';
import { Ride } from '../../database/entities/ride.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      DriverProfile,
      Ride,
      RefreshToken, // Add RefreshToken entity here
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
