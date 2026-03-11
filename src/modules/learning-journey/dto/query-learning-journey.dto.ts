import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsMongoId, IsOptional, IsString, Min, Max } from 'class-validator';

type LearningJourneyQueryMonth = number;

type LearningJourneyQueryYear = number;

export class QueryLearningJourneyDto {
  @ApiPropertyOptional({ description: 'Year and month of the learning journey in ISO format (YYYY-MM)' })
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
  children?: string;

  @ApiPropertyOptional({ description: 'Month number from 1 to 12' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: LearningJourneyQueryMonth;

  @ApiPropertyOptional({ description: 'Year as a four digit number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: LearningJourneyQueryYear;

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


