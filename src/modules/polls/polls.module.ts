import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Poll, PollSchema } from './schemas/poll.schema';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { PollsWithFeedService } from './polls-with-feed.service';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Poll.name, schema: PollSchema }]),
    forwardRef(() => FeedModule),
    NotificationsModule,
  ],
  controllers: [PollsController],
  providers: [PollsService, PollsWithFeedService],
  exports: [PollsService, PollsWithFeedService, MongooseModule],
})
export class PollsModule {}

