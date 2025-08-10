import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurgePricing } from 'src/database/entities/surge-pricing.entity';
import { SurgePricingController } from './surge-pricing.controller';
import { SurgePricingService } from './surge-pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurgePricing])],
  controllers: [SurgePricingController],
  providers: [SurgePricingService],
  exports: [SurgePricingService], // Export service so other modules can use it
})
export class SurgePricingModule {}
