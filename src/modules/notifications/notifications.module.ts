import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { FirebaseModule } from './config/firebase.module';

/**
 * Module for handling push notifications
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: Notification.name, schema: NotificationSchema }]),
    FirebaseModule,
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
