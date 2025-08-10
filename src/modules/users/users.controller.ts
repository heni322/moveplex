import { Controller, Get, Post, Put, Body, Param, Query, ValidationPipe } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body(ValidationPipe) createDto: CreateUserDto) {
    return this.usersService.createUser(createDto);
  }

  @Get(':userId')
  async getUser(@Param('userId') userId: string) {
    return this.usersService.getUser(userId);
  }

  @Get()
  async getUsers(@Query(ValidationPipe) filterDto: UserFilterDto) {
    return this.usersService.getUsers(filterDto);
  }

  @Put(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body(ValidationPipe) updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateDto);
  }

  @Put(':userId/verify')
  async verifyUser(@Param('userId') userId: string) {
    return this.usersService.verifyUser(userId);
  }

  @Put(':userId/activate')
  async activateUser(@Param('userId') userId: string) {
    return this.usersService.activateUser(userId);
  }

  @Put(':userId/deactivate')
  async deactivateUser(@Param('userId') userId: string) {
    return this.usersService.deactivateUser(userId);
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Get('phone/:phone')
  async getUserByPhone(@Param('phone') phone: string) {
    return this.usersService.getUserByPhone(phone);
  }

  @Get(':userId/profile')
  async getUserProfile(@Param('userId') userId: string) {
    return this.usersService.getUserProfile(userId);
  }
}
