import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyJournal, DailyJournalSchema } from './schemas/daily-journal.schema';
import { DailyJournalService } from './services/dailyjournal.service';
import { DailyJournalController } from './controllers/dailyjournal.controller';
import { Child, ChildSchema } from '../children/schemas/child.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyJournal.name, schema: DailyJournalSchema },
      { name: Child.name, schema: ChildSchema },
    ]),
  ],
  controllers: [DailyJournalController],
  providers: [DailyJournalService],
  exports: [DailyJournalService],
})
export class DailyJournalModule { }
