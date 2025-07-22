import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';


import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from 'src/database/entities/user.entity';
import { DriverProfile } from 'src/database/entities/driver-profile.entity';
import { Ride } from 'src/database/entities/ride.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, DriverProfile, Ride]), // Add this line
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule], // Export for use in other modules
})
export class AuthModule {}