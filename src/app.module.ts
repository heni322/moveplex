import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';

// Import all entities
import { User } from './database/entities/user.entity';
import { DriverProfile } from './database/entities/driver-profile.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { RideRequest } from './database/entities/ride-request.entity';
import { RideTracking } from './database/entities/ride-tracking.entity';
import { SurgePricing } from './database/entities/surge-pricing.entity';
import { Payment } from './database/entities/payment.entity';
import { Ride } from './database/entities/ride.entity';
import { RatingReview } from './database/entities/rating-review.entity';
import { Notification } from './database/entities/notification.entity';
import { RidesModule } from './modules/rides/rides.module';
import { RideRequestsModule } from './modules/ride-requests/ride-requests.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { UsersModule } from './modules/users/users.module';
import { SurgePricingModule } from './modules/surge-pricing/surge-pricing.module';
import { DriverProfileModule } from './modules/driver-profiles/driver-profiles.module';
import { RefreshToken } from './database/entities/refresh-token.entity';
import { HealthModule } from './modules/health/health.module';

// Debug environment variables
console.log('=== ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('DATABASE_USER:', process.env.DATABASE_USER);
console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '***HIDDEN***' : 'UNDEFINED');
console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***HIDDEN***' : 'UNDEFINED');
console.log('Current working directory:', process.cwd());
console.log('=== END ENVIRONMENT DEBUG ===');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Debug ConfigService values
        console.log('=== CONFIG SERVICE DEBUG ===');
        console.log('Config - DATABASE_HOST:', configService.get<string>('DATABASE_HOST'));
        console.log('Config - DATABASE_PORT:', configService.get<number>('DATABASE_PORT'));
        console.log('Config - DATABASE_USER:', configService.get<string>('DATABASE_USER'));
        console.log(
          'Config - DATABASE_PASSWORD:',
          configService.get<string>('DATABASE_PASSWORD') ? '***HIDDEN***' : 'UNDEFINED',
        );
        console.log('Config - DATABASE_NAME:', configService.get<string>('DATABASE_NAME'));
        console.log('=== END CONFIG SERVICE DEBUG ===');

        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          entities: [
            User,
            DriverProfile,
            Vehicle,
            RideRequest,
            RideTracking,
            Payment,
            SurgePricing,
            Ride,
            RatingReview,
            Notification,
            RefreshToken,
          ],
          synchronize: false,
          logging: true,
          migrations: ['dist/database/migrations/**/*{.ts,.js}'],
          migrationsRun: false, // Temporarily disabled to debug
        };

        console.log('=== FINAL DB CONFIG ===');
        console.log('Final DB Config:', {
          ...dbConfig,
          password: dbConfig.password ? '***HIDDEN***' : 'UNDEFINED',
        });
        console.log('=== END FINAL DB CONFIG ===');

        return dbConfig;
      },
      inject: [ConfigService],
    }),

    // Only keep the module imports
    AuthModule,
    DriverProfileModule,
    RidesModule,
    RideRequestsModule,
    PaymentsModule,
    NotificationsModule,
    RatingsModule,
    VehiclesModule,
    UsersModule,
    SurgePricingModule,
    HealthModule,
  ],

  // Remove all the duplicate controllers and services
  controllers: [AppController], // Only keep AppController
  providers: [AppService], // Only keep AppService
})
export class AppModule {}
