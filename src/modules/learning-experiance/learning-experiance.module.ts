import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningExperiance, LearningExperianceSchema } from './schemas/learning-experiance.schema';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';
import { LearningExperianceService } from './services/learning-experiance.service';
import { LearningExperianceController } from './controllers/learning-experiance.controller';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningExperiance.name, schema: LearningExperianceSchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [LearningExperianceController],
  providers: [LearningExperianceService],
  exports: [LearningExperianceService],
})
export class LearningExperianceModule {}

