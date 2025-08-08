import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error.message);
      return false;
    }
  }

  async getHealthStatus() {
    const isDatabaseHealthy = await this.checkDatabase();
    
    return {
      status: isDatabaseHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      },
      database: {
        status: isDatabaseHealthy ? 'connected' : 'disconnected',
      },
      services: {
        auth: 'active',
        rides: 'active',
        payments: 'active',
        notifications: 'active',
        locations: 'active',
      },
      pid: process.pid,
    };
  }
}