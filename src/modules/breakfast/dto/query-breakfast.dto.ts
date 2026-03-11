import { IsMongoId, IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BreakfastStatus } from '../schemas/breakfast.schema';
import { Type } from 'class-transformer';

export class QueryBreakfastDto {
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
    enum: BreakfastStatus,
    description: 'Filter by status',
  })
  @IsEnum(BreakfastStatus)
  @IsOptional()
  status?: BreakfastStatus;

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
