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
import { StoryStatus } from '../schemas/story.schema';

export class QueryStoryDto {
  @ApiPropertyOptional({
    description: 'Year and month of the story in ISO format (YYYY-MM), based on publishedAt',
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

  @ApiPropertyOptional({ description: 'Status of the story' })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @ApiPropertyOptional({ description: 'Free text search by story title' })
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


