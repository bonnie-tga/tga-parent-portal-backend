import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schema/event.schema';
import { EventResponse, EventResponseSchema } from './schema/event-responce.schema';
import { EventResponseService } from './service/event-responce.service';
import { EventResponseController } from './controller/event-responce.controller';
import { EventService } from './service/event.service';
import { EventController } from './controller/event.controller';
import { FeedModule } from '../feed/feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    forwardRef(() => FeedModule),
    forwardRef(() => CommentsModule),
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventResponse.name, schema: EventResponseSchema },
    ]),
  ],
  controllers: [EventController, EventResponseController],
  providers: [EventService, EventResponseService],
  exports: [EventService, EventResponseService],
})
export class EventModule {}


