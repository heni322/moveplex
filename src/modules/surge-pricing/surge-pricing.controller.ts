import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  CreateSurgePricingDto,
  UpdateSurgePricingDto,
  SurgePricingFilterDto,
} from './dto/surge-pricing.dto';
import { SurgePricingService } from './surge-pricing.service';

@Controller('surge-pricing')
export class SurgePricingController {
  constructor(private readonly surgePricingService: SurgePricingService) {}

  @Post()
  async createSurgeArea(@Body(ValidationPipe) createDto: CreateSurgePricingDto) {
    return this.surgePricingService.createSurgeArea(createDto);
  }

  @Get(':surgeId')
  async getSurgeArea(@Param('surgeId') surgeId: string) {
    return this.surgePricingService.getSurgeArea(surgeId);
  }

  @Get()
  async getSurgeAreas(@Query(ValidationPipe) filterDto: SurgePricingFilterDto) {
    return this.surgePricingService.getSurgeAreas(filterDto);
  }

  @Put(':surgeId')
  async updateSurgeArea(
    @Param('surgeId') surgeId: string,
    @Body(ValidationPipe) updateDto: UpdateSurgePricingDto,
  ) {
    return this.surgePricingService.updateSurgeArea(surgeId, updateDto);
  }

  @Delete(':surgeId')
  async deleteSurgeArea(@Param('surgeId') surgeId: string) {
    return this.surgePricingService.deleteSurgeArea(surgeId);
  }

  @Put(':surgeId/activate')
  async activateSurgeArea(@Param('surgeId') surgeId: string) {
    return this.surgePricingService.activateSurgeArea(surgeId);
  }

  @Put(':surgeId/deactivate')
  async deactivateSurgeArea(@Param('surgeId') surgeId: string) {
    return this.surgePricingService.deactivateSurgeArea(surgeId);
  }

  @Post('check-location')
  async checkSurgeAtLocation(@Body() body: { latitude: number; longitude: number }) {
    return this.surgePricingService.getSurgeMultiplierAtLocation(body.latitude, body.longitude);
  }

  @Get('active/all')
  async getActiveSurgeAreas() {
    return this.surgePricingService.getActiveSurgeAreas();
  }
}
