import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { SurveyStatus } from '../enums/survey-status.enum';

export class QuerySurveyDto {
  @ApiPropertyOptional({ enum: Object.values(SurveyStatus), enumName: 'SurveyStatus' })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;

  @ApiPropertyOptional({ description: 'Filter by campus ID' })
  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Search by title, category, or question text' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number = 0;
}
