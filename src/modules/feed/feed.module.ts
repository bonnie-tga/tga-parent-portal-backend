import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedItem, FeedItemSchema } from './schemas/feed-item.schema';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { Announcement, AnnouncementSchema } from '../announcements/schemas/announcement.schema';
import { Poll, PollSchema } from '../polls/schemas/poll.schema';
import { Event, EventSchema } from '../event/schema/event.schema';
import { Survey, SurveySchema } from '../surveys/schemas/survey.schema';
import { CommentsModule } from '../comments/comments.module';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';
import { DailyChart, DailyChartSchema } from '../daily-chart/schemas/daily-chart.schema';
import { Handover, HandoverSchema } from '../handover/schemas/handover.schema';
import { Menu, MenuSchema } from '../menu/schemas/menu.schema';
import { NappyChange, NappyChangeSchema } from '../nappy-change/schemas/nappy-change.schema';
import { Sunscreen, SunscreenSchema } from '../sunscreen/schemas/sunscreen.schema';
import { ToiletTraining, ToiletTrainingSchema } from '../toilet-training/schemas/toilet-training.schema';
import { Breakfast, BreakfastSchema } from '../breakfast/schemas/breakfast.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Child.name, schema: ChildSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: Event.name, schema: EventSchema },
      { name: Poll.name, schema: PollSchema },
      { name: Survey.name, schema: SurveySchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: DailyChart.name, schema: DailyChartSchema },
      { name: Handover.name, schema: HandoverSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: NappyChange.name, schema: NappyChangeSchema },
      { name: Sunscreen.name, schema: SunscreenSchema },
      { name: ToiletTraining.name, schema: ToiletTrainingSchema },
      { name: Breakfast.name, schema: BreakfastSchema },
    ]),
    forwardRef(() => CommentsModule),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService, MongooseModule],
})
export class FeedModule {}

