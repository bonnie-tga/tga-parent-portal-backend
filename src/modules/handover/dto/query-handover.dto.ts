import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { HandoverStatus } from '../schemas/handover.schema';

export class QueryHandoverDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Campus filter' })
  @IsMongoId()
  @IsOptional()
  campus?: string;
  
  @ApiPropertyOptional({ enum: HandoverStatus })
  @IsEnum(HandoverStatus)
  @IsOptional()
  status?: HandoverStatus;

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


