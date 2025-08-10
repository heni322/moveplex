import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

import { RefreshTokenDto } from '../../common/dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Delete('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  async logoutAll(@CurrentUser() user: User) {
    return await this.authService.logoutAll(user.id);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isVerified: user.isVerified,
      driverProfile: user.driverProfile,
    };
  }
}
