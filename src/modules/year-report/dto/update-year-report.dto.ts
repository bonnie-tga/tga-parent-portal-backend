import { PartialType } from '@nestjs/swagger';
import { CreateYearReportDto } from './create-year-report.dto';

export class UpdateYearReportDto extends PartialType(CreateYearReportDto) {}




