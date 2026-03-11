import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

export class QueryWellbeingDto {
  @ApiPropertyOptional({
    description: 'Date in YYYY-MM-DD format to filter activities. If not provided, returns latest activities',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Child ID to filter activities',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  childId?: string;

  @ApiPropertyOptional({
    enum: ['sleep-timer', 'daily-chart', 'nappy-change', 'toilet-training'],
    description: 'Filter by activity type',
  })
  @IsEnum(['sleep-timer', 'daily-chart', 'nappy-change', 'toilet-training'])
  @IsOptional()
  type?: 'sleep-timer' | 'daily-chart' | 'nappy-change' | 'toilet-training';

  @ApiPropertyOptional({
    description: 'Campus ID to filter activities',
    example: '507f1f77bcf86cd799439013',
  })
  @IsMongoId()
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({
    description: 'Created by user ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    enum: ['createdAt', 'type', 'childId'],
    default: 'createdAt',
    description: 'Sort by field',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
