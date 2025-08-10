import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    // Import TypeORM connection for database health checks
    TypeOrmModule.forFeature([]), // Empty array since we only need connection
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // Export in case other modules need health checks
})
export class HealthModule {}
