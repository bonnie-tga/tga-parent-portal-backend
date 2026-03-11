import { IsMongoId, IsOptional, IsBoolean, IsEnum, IsInt, Min, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DailyChartStatus } from '../schemas/daily-chart.schema';

export enum DailyChartSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryDailyChartDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 15, description: 'Maximum items per page', default: 15 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'search text', description: 'Free text search query' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'lastModified',
    description: 'Field name to sort by',
    default: 'lastModified',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: DailyChartSortOrder,
    description: 'Sort direction',
    default: DailyChartSortOrder.DESC,
  })
  @IsEnum(DailyChartSortOrder)
  @IsOptional()
  sortOrder?: DailyChartSortOrder;

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
    enum: DailyChartStatus,
    description: 'Filter by status',
  })
  @IsEnum(DailyChartStatus)
  @IsOptional()
  status?: DailyChartStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by deleted status',
  })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by date (ISO date string)',
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}
