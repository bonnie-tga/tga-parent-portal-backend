import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningJourney, LearningJourneySchema } from './schemas/learning-journey.schema';
import { LearningJourneyController } from './controllers/learning-journey.controller';
import { LearningJourneyService } from './services/learning-journey.service';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';
import { WellnessPlan, WellnessPlanSchema } from '../wellness-plan/schemas/wellness-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningJourney.name, schema: LearningJourneySchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: WellnessPlan.name, schema: WellnessPlanSchema },
    ]),
  ],
  controllers: [LearningJourneyController],
  providers: [LearningJourneyService],
  exports: [LearningJourneyService],
})
export class LearningJourneyModule {}


