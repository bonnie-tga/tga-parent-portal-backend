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
  ChangeDetailsDecisionStatus,
  ChangeDetailsStatus,
} from '../schemas/change-details.schema';

export class QueryChangeDetailsDto {
  @ApiPropertyOptional({
    description: 'Year and month in ISO format (YYYY-MM), based on createdAt',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Campus identifier' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room identifier' })
  @IsOptional()
  @IsMongoId()
  room?: string;

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
  @IsEnum(ChangeDetailsStatus)
  status?: ChangeDetailsStatus;

  @ApiPropertyOptional({ description: 'Decision status of the request' })
  @IsOptional()
  @IsEnum(ChangeDetailsDecisionStatus)
  decisionStatus?: ChangeDetailsDecisionStatus;

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


