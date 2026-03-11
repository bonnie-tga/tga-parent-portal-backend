import { PartialType } from '@nestjs/swagger';
import { CreateDailyChartDto } from './create-daily-chart.dto';

export class UpdateDailyChartDto extends PartialType(CreateDailyChartDto) {}
