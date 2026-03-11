import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YearReport, YearReportSchema } from './schemas/year-report.schema';
import { YearReportController } from './controllers/year-report.controller';
import { YearReportService } from './services/year-report.service';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { DailyJournal, DailyJournalSchema } from '../daily-journal/schemas/daily-journal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YearReport.name, schema: YearReportSchema },
      { name: Child.name, schema: ChildSchema },
      { name: DailyJournal.name, schema: DailyJournalSchema },
    ]),
  ],
  controllers: [YearReportController],
  providers: [YearReportService],
  exports: [YearReportService],
})
export class YearReportModule {}


