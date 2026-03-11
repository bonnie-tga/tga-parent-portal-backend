import { PartialType } from '@nestjs/swagger';
import { CreateDailyJournalDto } from './create-dailyjournal.dto';

export class UpdateDailyJournalDto extends PartialType(CreateDailyJournalDto) {}
