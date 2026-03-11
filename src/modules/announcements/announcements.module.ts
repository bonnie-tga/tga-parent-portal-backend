import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnnouncementService } from './services/announcement.service';
import { AnnouncementController } from './controllers/announcement.controller';
import { MediaModule } from '../media/media.module';
import { Media, MediaSchema } from '../media/media.entity';
import { GoogleStorageService } from 'src/google-drive/google-storage.service';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    MediaModule,
    forwardRef(() => FeedModule),
    NotificationsModule,
    forwardRef(() => CommentsModule),
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: User.name, schema: UserSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, GoogleStorageService],
  exports: [AnnouncementService, GoogleStorageService],
})
export class AnnouncementsModule {}
