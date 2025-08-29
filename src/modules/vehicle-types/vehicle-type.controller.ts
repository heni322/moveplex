import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { VehicleType } from '../../database/entities/vehicle-type.entity';
import { VehicleTypeService } from './vehicle-type.service';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, VehicleTypeFilterDto } from './dto/vehicle-type.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { FileInterceptor } from '@nestjs/platform-express';


@ApiTags('vehicle-types')
@Controller('vehicle-types')
export class VehicleTypeController {
  constructor(private readonly vehicleTypeService: VehicleTypeService) {}

  @Post()
  @UseInterceptors(FileInterceptor('icon'))
  @ApiOperation({ summary: 'Create a new vehicle type with optional icon upload' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ 
    description: 'Vehicle type created successfully', 
    type: VehicleType 
  })
  @ApiConflictResponse({ description: 'Vehicle type with this name already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data or file format' })
  async create(
    @Body() createVehicleTypeDto: CreateVehicleTypeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|svg|webp)$/ }),
        ],
        fileIsRequired: false, // Icon is optional
      }),
    )
    iconFile?: Express.Multer.File,
  ): Promise<VehicleType> {
    return this.vehicleTypeService.create(createVehicleTypeDto, iconFile);
  }


  @Get()
  @ApiOperation({ summary: 'Get all vehicle types with filtering and pagination' })
  @ApiOkResponse({
    description: 'Vehicle types retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/VehicleType' }
            }
          }
        }
      ]
    }
  })
  findAll(@Query() filterDto: VehicleTypeFilterDto): Promise<PaginatedResponse<VehicleType>> {
    return this.vehicleTypeService.findAll(filterDto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active vehicle types (for dropdowns)' })
  @ApiOkResponse({ 
    description: 'Active vehicle types retrieved successfully', 
    type: [VehicleType] 
  })
  findAllActive(): Promise<VehicleType[]> {
    return this.vehicleTypeService.findAllActive();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vehicle type statistics' })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        inactive: { type: 'number' },
        mostUsed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              vehicleCount: { type: 'number' }
            }
          }
        }
      }
    }
  })
  getStats() {
    return this.vehicleTypeService.getStats();
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Get a vehicle type by name' })
  @ApiOkResponse({ description: 'Vehicle type found', type: VehicleType })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  findByName(@Param('name') name: string): Promise<VehicleType> {
    return this.vehicleTypeService.findByName(name);
  }

  @Get('with-vehicle-count')
  @ApiOperation({ summary: 'Get all vehicle types with their vehicle counts' })
  @ApiOkResponse({
    description: 'Vehicle types with counts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        allOf: [
          { $ref: '#/components/schemas/VehicleType' },
          {
            properties: {
              vehicleCount: { type: 'number' }
            }
          }
        ]
      }
    }
  })
  findAllWithVehicleCount(): Promise<(VehicleType & { vehicleCount: number })[]> {
    return this.vehicleTypeService.findAllWithVehicleCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle type by ID' })
  @ApiOkResponse({ description: 'Vehicle type found', type: VehicleType })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleType> {
    return this.vehicleTypeService.findOne(id);
  }

  @Get(':id/vehicles')
  @ApiOperation({ summary: 'Get all vehicles of a specific type' })
  @ApiOkResponse({
    description: 'Vehicles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        vehicleType: { $ref: '#/components/schemas/VehicleType' },
        vehicles: {
          type: 'array',
          items: { $ref: '#/components/schemas/Vehicle' }
        },
        count: { type: 'number' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  getVehiclesByType(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleTypeService.getVehiclesByType(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vehicle type' })
  @ApiOkResponse({ 
    description: 'Vehicle type updated successfully', 
    type: VehicleType 
  })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  @ApiConflictResponse({ description: 'Vehicle type with this name already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVehicleTypeDto: UpdateVehicleTypeDto,
  ): Promise<VehicleType> {
    return this.vehicleTypeService.update(id, updateVehicleTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle type (hard delete)' })
  @ApiNoContentResponse({ description: 'Vehicle type deleted successfully' })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  @ApiBadRequestResponse({ 
    description: 'Cannot delete vehicle type with associated vehicles' 
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehicleTypeService.remove(id);
  }

  @Patch(':id/soft-delete')
  @ApiOperation({ summary: 'Soft delete a vehicle type (deactivate)' })
  @ApiOkResponse({ 
    description: 'Vehicle type deactivated successfully', 
    type: VehicleType 
  })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleType> {
    return this.vehicleTypeService.softDelete(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted vehicle type' })
  @ApiOkResponse({ 
    description: 'Vehicle type restored successfully', 
    type: VehicleType 
  })
  @ApiNotFoundResponse({ description: 'Vehicle type not found' })
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleType> {
    return this.vehicleTypeService.restore(id);
  }
}