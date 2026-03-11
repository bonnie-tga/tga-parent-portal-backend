import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LittleAboutMe,
  LittleAboutMeSchema,
} from './schemas/little-about-me.schema';
import {
  LittleAboutMeHistory,
  LittleAboutMeHistorySchema,
} from './schemas/little-about-me-history.schema';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { LittleAboutMeController } from './controllers/little-about-me.controller';
import { LittleAboutMeService } from './services/little-about-me.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: LittleAboutMe.name,
        schema: LittleAboutMeSchema,
      },
      {
        name: LittleAboutMeHistory.name,
        schema: LittleAboutMeHistorySchema,
      },
      {
        name: Child.name,
        schema: ChildSchema,
      },
    ]),
    NotificationsModule,
  ],
  controllers: [LittleAboutMeController],
  providers: [LittleAboutMeService],
  exports: [LittleAboutMeService],
})
export class LittleAboutMeModule {}