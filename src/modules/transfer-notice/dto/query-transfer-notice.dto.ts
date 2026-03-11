import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  TransferNoticeDecisionStatus,
  TransferNoticeStatus,
} from '../schemas/transfer-notice.schema';

export class QueryTransferNoticeDto {
  @ApiPropertyOptional({
    description:
      'Year and month in ISO format (YYYY-MM), based on createdAt field',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Old campus identifier' })
  @IsOptional()
  @IsMongoId()
  oldCampus?: string;

  @ApiPropertyOptional({ description: 'New campus identifier' })
  @IsOptional()
  @IsMongoId()
  newCampus?: string;

  @ApiPropertyOptional({ description: 'Child identifier' })
  @IsOptional()
  @IsMongoId()
  child?: string;

  @ApiPropertyOptional({ description: 'Submitted-by user identifier' })
  @IsOptional()
  @IsMongoId()
  parent?: string;

  @ApiPropertyOptional({ description: 'Publish status of the request' })
  @IsOptional()
  @IsEnum(TransferNoticeStatus)
  status?: TransferNoticeStatus;

  @ApiPropertyOptional({ description: 'Decision status of the request' })
  @IsOptional()
  @IsEnum(TransferNoticeDecisionStatus)
  decisionStatus?: TransferNoticeDecisionStatus;

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'Filter by deleted status (true to view trash)',
  })
  @IsString()
  @IsOptional()
  isDeleted?: string;

  @ApiPropertyOptional({ description: 'Free text search by child name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

