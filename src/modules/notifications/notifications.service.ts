import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BulkNotificationDto,
  CreateNotificationDto,
  NotificationFilterDto,
  UpdateNotificationStatusDto,
} from './dto/notifications.dto';
import { NotificationStatus, Notification } from '../../database/entities/notification.entity';

// Define interfaces for query results to fix typing issues
interface TypeStatsResult {
  type: string;
  count: string;
}

interface StatusStatsResult {
  status: string;
  count: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(createDto: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        ...createDto,
        status: NotificationStatus.PENDING,
        isRead: false,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      //   this.logger.log(`Notification created with ID: ${savedNotification.id}`);

      // Here you would typically trigger the actual notification sending
      // await this.sendNotification(savedNotification);

      return savedNotification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw new BadRequestException('Failed to create notification');
    }
  }

  async getNotification(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  async getUserNotifications(
    userId: string,
    filterDto: NotificationFilterDto,
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .where('notification.userId = :userId', { userId });

    // Apply filters
    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    // Apply sorting
    queryBuilder.orderBy(`notification.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.getNotification(notificationId);

    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    const updatedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`Notification ${notificationId} marked as read`);
    return updatedNotification;
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    this.logger.log(`Marked ${result.affected} notifications as read for user ${userId}`);
    return { updatedCount: result.affected ?? 0 };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const result = await this.notificationRepository.delete(notificationId);

    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    this.logger.log(`Notification ${notificationId} deleted`);
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  broadcastNotification(createDto: CreateNotificationDto): {
    message: string;
    totalSent: number;
  } {
    // This is a simplified version - in a real app, you'd want to:
    // 1. Get all active users or use a user service
    // 2. Create notifications in batches for better performance
    // 3. Use a queue system for processing

    try {
      // For demo purposes, we'll assume you have a way to get all user IDs
      // In practice, you might want to pass user IDs or use criteria
      this.notificationRepository.create({
        ...createDto,
        status: NotificationStatus.PENDING,
        isRead: false,
      });

      // This is a placeholder - you'd implement actual broadcast logic
      this.logger.log('Broadcasting notification to all users');

      return {
        message: 'Broadcast notification initiated',
        totalSent: 1, // This would be the actual count
      };
    } catch (error) {
      this.logger.error('Failed to broadcast notification', error);
      throw new BadRequestException('Failed to broadcast notification');
    }
  }

  async bulkCreateNotifications(bulkDto: BulkNotificationDto): Promise<{
    message: string;
    totalCreated: number;
  }> {
    const { userIds, ...notificationData } = bulkDto;

    const notifications = userIds.map(userId =>
      this.notificationRepository.create({
        ...notificationData,
        userId,
        status: NotificationStatus.PENDING,
        isRead: false,
      }),
    );

    const savedNotifications = await this.notificationRepository.save(notifications);

    this.logger.log(`Created ${savedNotifications.length} notifications for bulk send`);

    return {
      message: 'Bulk notifications created successfully',
      totalCreated: savedNotifications.length,
    };
  }

  async updateNotificationStatus(
    notificationId: string,
    updateDto: UpdateNotificationStatusDto,
  ): Promise<Notification> {
    const notification = await this.getNotification(notificationId);

    Object.assign(notification, updateDto);

    if (updateDto.status === NotificationStatus.SENT && !notification.sentAt) {
      notification.sentAt = new Date();
    }

    const updatedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`Notification ${notificationId} status updated to ${updateDto.status}`);
    return updatedNotification;
  }

  // Helper method for cleanup - can be called by a cron job
  async cleanupOldNotifications(daysOld: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isRead = :isRead', { isRead: true })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old notifications`);
    return { deletedCount: result.affected ?? 0 };
  }

  // Helper method to get notification statistics
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const whereClause = userId ? { userId } : {};

    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: whereClause }),
      this.notificationRepository.count({ where: { ...whereClause, isRead: false } }),
    ]);

    // Get counts by type and status with proper typing
    const typeStats: TypeStatsResult[] = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(userId ? 'notification.userId = :userId' : '1=1', { userId })
      .groupBy('notification.type')
      .getRawMany();

    const statusStats: StatusStatsResult[] = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(userId ? 'notification.userId = :userId' : '1=1', { userId })
      .groupBy('notification.status')
      .getRawMany();

    // Fixed: Properly typed reduce functions
    const byType: Record<string, number> = typeStats.reduce(
      (acc: Record<string, number>, item: TypeStatsResult) => {
        acc[item.type] = parseInt(item.count, 10);
        return acc;
      },
      {},
    );

    const byStatus: Record<string, number> = statusStats.reduce(
      (acc: Record<string, number>, item: StatusStatsResult) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      },
      {},
    );

    return {
      total,
      unread,
      byType,
      byStatus,
    };
  }
}
