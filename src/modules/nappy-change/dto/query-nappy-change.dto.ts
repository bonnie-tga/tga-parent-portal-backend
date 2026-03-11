import { ApiPropertyOptional } from '@nestjs/swagger';
import {  Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Min, IsDateString } from 'class-validator';

export class QueryNappyChangeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Campus filter' })
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room filter' })
  @IsMongoId()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'Filter by date (ISO date string)' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['date', 'publishedAt', 'campus', 'room', 'author', 'createdAt'] })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}


