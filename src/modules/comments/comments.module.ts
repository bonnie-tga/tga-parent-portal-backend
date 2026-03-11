import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsController } from './controllers/comments.controller';
import { CommentsService } from './services/comments.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { CommentThreadSeen, CommentThreadSeenSchema } from './schemas/comment-thread-seen.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Event, EventSchema } from '../event/schema/event.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';
import { YearReport, YearReportSchema } from '../year-report/schemas/year-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
      { name: CommentThreadSeen.name, schema: CommentThreadSeenSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: YearReport.name, schema: YearReportSchema },
    ]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => AnnouncementsModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
