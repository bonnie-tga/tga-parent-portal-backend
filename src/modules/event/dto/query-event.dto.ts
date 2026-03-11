import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

export class QueryEventDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['title', 'createdAt', 'startDate', 'endDate', 'totalLikes'] })
  @IsIn(['title', 'createdAt', 'startDate', 'endDate', 'totalLikes'])
  @IsOptional()
  sortBy?: 'title' | 'createdAt' | 'startDate' | 'endDate' | 'totalLikes';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  status?: string[];

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  rsvpRequired?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campusIds?: string[];
}


