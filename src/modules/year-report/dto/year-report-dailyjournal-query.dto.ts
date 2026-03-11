import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional } from 'class-validator';

type YearReportQueryYear = number;

export class YearReportDailyJournalQueryDto {
  @ApiPropertyOptional({
    description:
      'Calendar year. If omitted, the current year is used.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: YearReportQueryYear;

  @ApiPropertyOptional({ description: 'Campus identifier' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room identifier' })
  @IsOptional()
  @IsMongoId()
  room?: string;

  @ApiPropertyOptional({
    description:
      'Child identifier. When provided, only Individual Learning items where this child is tagged are returned.',
  })
  @IsMongoId()
  children?: string;
}
