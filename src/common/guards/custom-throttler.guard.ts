import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by IP and user ID if authenticated
    const ip = req.ip;
    const userId = req.user?.id;
    return userId ? `${userId}` : `${ip}`;
  }
}