import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroveCurriculum, GroveCurriculumSchema } from './schemas/grove-curriculum.schema';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';
import { GroveCurriculumService } from './services/grove-curriculum.service';
import { GroveCurriculumController } from './controllers/grove-curriculum.controller';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';
import { AutoFeedModule } from '../auto-feed/auto-feed.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroveCurriculum.name, schema: GroveCurriculumSchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    AutoFeedModule,
  ],
  controllers: [GroveCurriculumController],
  providers: [GroveCurriculumService],
  exports: [GroveCurriculumService],
})
export class GroveCurriculumModule {}

