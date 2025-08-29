import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateVehicleDto, UpdateVehicleDto, VehicleFilterDto } from './dto/vehicles.dto';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiCreatedResponse({
    description: 'Vehicle created successfully',
    type: Vehicle,
  })
  @ApiConflictResponse({ description: 'Vehicle with this license plate already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data or vehicle types' })
  async createVehicle(
    @Body(ValidationPipe) createDto: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehiclesService.createVehicle(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles with filtering and pagination' })
  @ApiOkResponse({
    description: 'Vehicles retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Vehicle' },
            },
          },
        },
      ],
    },
  })
  async getVehicles(
    @Query(ValidationPipe) filterDto: VehicleFilterDto,
  ): Promise<PaginatedResponse<Vehicle>> {
    return this.vehiclesService.getVehicles(filterDto);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get all verified vehicles' })
  @ApiOkResponse({
    description: 'Verified vehicles retrieved successfully',
    type: [Vehicle],
  })
  async getVerifiedVehicles(): Promise<Vehicle[]> {
    return this.vehiclesService.getVerifiedVehicles();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vehicle statistics' })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        verified: { type: 'number' },
        unverified: { type: 'number' },
        byMake: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        byYear: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        bySeats: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        averageYear: { type: 'number' },
      },
    },
  })
  async getVehicleStats() {
    return this.vehiclesService.getVehicleStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search vehicles by make, model, color, or license plate' })
  @ApiQuery({
    name: 'q',
    description: 'Search term',
    example: 'Toyota',
  })
  @ApiOkResponse({
    description: 'Search results retrieved successfully',
    type: [Vehicle],
  })
  async searchVehicles(@Query('q') searchTerm: string): Promise<Vehicle[]> {
    return this.vehiclesService.searchVehicles(searchTerm);
  }

  @Get('by-type/:vehicleTypeId')
  @ApiOperation({ summary: 'Get all vehicles of a specific type' })
  @ApiOkResponse({
    description: 'Vehicles retrieved successfully',
    type: [Vehicle],
  })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  async getVehiclesByType(
    @Param('vehicleTypeId', ParseUUIDPipe) vehicleTypeId: string,
  ): Promise<Vehicle[]> {
    return this.vehiclesService.getVehiclesByType(vehicleTypeId);
  }

  @Get('by-types')
  @ApiOperation({ summary: 'Get vehicles by multiple vehicle types' })
  @ApiQuery({
    name: 'typeIds',
    description: 'Comma-separated list of vehicle type IDs',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiOkResponse({
    description: 'Vehicles retrieved successfully',
    type: [Vehicle],
  })
  async getVehiclesByMultipleTypes(
    @Query('typeIds', new ParseArrayPipe({ items: String, separator: ',' }))
    vehicleTypeIds: string[],
  ): Promise<Vehicle[]> {
    return this.vehiclesService.getVehiclesByMultipleTypes(vehicleTypeIds);
  }

  @Get('by-make-model/:make/:model')
  @ApiOperation({ summary: 'Get vehicles by make and model' })
  @ApiOkResponse({
    description: 'Vehicles retrieved successfully',
    type: [Vehicle],
  })
  async getVehiclesByMakeAndModel(
    @Param('make') make: string,
    @Param('model') model: string,
  ): Promise<Vehicle[]> {
    return this.vehiclesService.getVehiclesByMakeAndModel(make, model);
  }

  @Get('license-plate/:licensePlate')
  @ApiOperation({ summary: 'Get a vehicle by license plate' })
  @ApiOkResponse({
    description: 'Vehicle found',
    type: Vehicle,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  async getVehicleByLicensePlate(
    @Param('licensePlate') licensePlate: string,
  ): Promise<Vehicle> {
    return this.vehiclesService.getVehicleByLicensePlate(licensePlate);
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiOkResponse({
    description: 'Vehicle found',
    type: Vehicle,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  async getVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<Vehicle> {
    return this.vehiclesService.getVehicle(vehicleId);
  }

  @Put(':vehicleId')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiOkResponse({
    description: 'Vehicle updated successfully',
    type: Vehicle,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiConflictResponse({ description: 'Vehicle with this license plate already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data or vehicle types' })
  async updateVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body(ValidationPipe) updateDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehiclesService.updateVehicle(vehicleId, updateDto);
  }

  @Patch(':vehicleId/verify')
  @ApiOperation({ summary: 'Verify a vehicle' })
  @ApiOkResponse({
    description: 'Vehicle verified successfully',
    type: Vehicle,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({ description: 'Vehicle is already verified' })
  async verifyVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<Vehicle> {
    return this.vehiclesService.verifyVehicle(vehicleId);
  }

  @Patch(':vehicleId/unverify')
  @ApiOperation({ summary: 'Unverify a vehicle' })
  @ApiOkResponse({
    description: 'Vehicle unverified successfully',
    type: Vehicle,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({ description: 'Vehicle is already unverified' })
  async unverifyVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<Vehicle> {
    return this.vehiclesService.unverifyVehicle(vehicleId);
  }

  @Patch('bulk-verify')
  @ApiOperation({ summary: 'Bulk verify multiple vehicles' })
  @ApiOkResponse({
    description: 'Bulk verification completed',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number' },
        errors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async bulkVerifyVehicles(
    @Body('vehicleIds', new ParseArrayPipe({ items: String }))
    vehicleIds: string[],
  ): Promise<{ updated: number; errors: string[] }> {
    return this.vehiclesService.bulkVerifyVehicles(vehicleIds);
  }

  @Delete(':vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiNoContentResponse({ description: 'Vehicle deleted successfully' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete vehicle with associated driver profiles',
  })
  async deleteVehicle(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<void> {
    return this.vehiclesService.deleteVehicle(vehicleId);
  }
}