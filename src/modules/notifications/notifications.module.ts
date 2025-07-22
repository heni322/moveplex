import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { User } from 'src/database/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { Notification } from 'src/database/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Export service for use in other modules
})
export class NotificationsModule {}