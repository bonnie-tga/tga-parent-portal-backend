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
  ChangeAttendanceDecisionStatus,
  ChangeAttendanceStatus,
} from '../schemas/change-attendance.schema';

export class QueryChangeAttendanceDto {
  @ApiPropertyOptional({
    description:
      'Year and month in ISO format (YYYY-MM), based on commenceOn date',
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
  @IsEnum(ChangeAttendanceStatus)
  status?: ChangeAttendanceStatus;

  @ApiPropertyOptional({ description: 'Outcome status of the request' })
  @IsOptional()
  @IsEnum(ChangeAttendanceDecisionStatus)
  decisionStatus?: ChangeAttendanceDecisionStatus;

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


