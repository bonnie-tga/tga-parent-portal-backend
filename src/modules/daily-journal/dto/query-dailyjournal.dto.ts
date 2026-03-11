import { IsMongoId, IsOptional, IsBoolean, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DailyJournalStatus } from '../schemas/daily-journal.schema';

export class QueryDailyJournalDto {
  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109ca',
    description: 'Filter by campus ID',
  })
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cb',
    description: 'Filter by room ID',
  })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cc',
    description: 'Filter by child ID',
  })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiPropertyOptional({
    enum: DailyJournalStatus,
    description: 'Filter by status',
  })
  @IsEnum(DailyJournalStatus)
  @IsOptional()
  status?: DailyJournalStatus;

  @ApiPropertyOptional({
    enum: ['date', 'createdAt', 'updatedAt', 'publishedDate', 'title'],
    description: 'Field to sort by',
    default: 'date',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'date';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
