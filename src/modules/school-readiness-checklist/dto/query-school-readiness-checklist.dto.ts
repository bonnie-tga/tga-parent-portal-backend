import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { SchoolReadinessChecklistStatus } from '../schemas/school-readiness-checklist.schema';

export class QuerySchoolReadinessChecklistDto {
  @ApiPropertyOptional({ description: 'Campus identifier' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Status of the checklist' })
  @IsOptional()
  @IsEnum(SchoolReadinessChecklistStatus)
  status?: SchoolReadinessChecklistStatus;

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


