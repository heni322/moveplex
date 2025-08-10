import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Complete health check' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600,
        environment: 'production',
        database: { status: 'connected' },
        services: {
          auth: 'active',
          rides: 'active',
          payments: 'active',
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async healthCheck(@Res() res: Response) {
    try {
      const healthStatus = await this.healthService.getHealthStatus();

      if (healthStatus.status === 'ok') {
        return res.status(HttpStatus.OK).json(healthStatus);
      } else {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(healthStatus);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        uptime: process.uptime(),
      });
    }
  }

  @Get('simple')
  @ApiOperation({ summary: 'Simple health check' })
  @ApiResponse({
    status: 200,
    description: 'Simple health status',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  simpleHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes/Docker' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  async readinessCheck(@Res() res: Response) {
    try {
      const isDatabaseHealthy = await this.healthService.checkDatabase();

      if (isDatabaseHealthy) {
        return res.status(HttpStatus.OK).json({ status: 'ready' });
      } else {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'not ready' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        error: errorMessage,
      });
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes/Docker' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
