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
  CreateNotificationDto, 
  NotificationFilterDto,
  MarkAsReadDto 
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(@Body(ValidationPipe) createDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createDto);
  }

  @Get(':notificationId')
  async getNotification(@Param('notificationId') notificationId: string) {
    return this.notificationsService.getNotification(notificationId);
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query(ValidationPipe) filterDto: NotificationFilterDto,
  ) {
    return this.notificationsService.getUserNotifications(userId, filterDto);
  }

  @Put(':notificationId/read')
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':notificationId')
  async deleteNotification(@Param('notificationId') notificationId: string) {
    return this.notificationsService.deleteNotification(notificationId);
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post('broadcast')
  async broadcastNotification(@Body(ValidationPipe) createDto: CreateNotificationDto) {
    return this.notificationsService.broadcastNotification(createDto);
  }
}