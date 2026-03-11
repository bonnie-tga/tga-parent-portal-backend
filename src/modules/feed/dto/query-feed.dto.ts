import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryFeedDto {
  @ApiPropertyOptional({
    enum: ['announcement', 'event', 'poll', 'survey', 'daily-journal', 'grove-curriculum'],
    description: 'Filter by type',
  })
  @IsOptional()
  @IsEnum(['announcement', 'event', 'poll', 'survey', 'daily-journal', 'grove-curriculum'])
  type?: 'announcement' | 'event' | 'poll' | 'survey' | 'daily-journal' | 'grove-curriculum';

  @ApiPropertyOptional({ description: 'Filter by campus ID' })
  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific child ID (shows feed for that child\'s campus only)' 
  })
  @IsOptional()
  @IsMongoId()
  childId?: string;

  @ApiPropertyOptional({
    description: 'Get items created after this date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Filter items by specific date (ISO format or YYYY-MM-DD)',
    example: '2025-11-26',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsEnum(['active', 'archived'])
  status?: 'active' | 'archived';

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by month (for grove-curriculum type). Values: January, February, March, April, May, June, July, August, September, October, November, December',
    example: 'September',
  })
  @IsOptional()
  @IsString()
  month?: string;

  // Internal fields (not exposed in API)
  selectedChild?: any;
  selectedChildren?: any[];
}

