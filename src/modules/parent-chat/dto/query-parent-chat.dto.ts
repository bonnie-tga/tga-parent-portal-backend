import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ParentChatStatus, ParentChatDecisionStatus } from '../../parent-chat/schemas/parent-chat.schema';

export class QueryParentChatDto {
  @ApiPropertyOptional({ example: '01-2024', description: 'Filter by month-year format' })
  @IsString()
  @IsOptional()
  dates?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by campus' })
  @IsString()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({ description: 'Filter by room' })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ enum: ['all', 'new'], description: 'Filter by message type' })
  @IsEnum(['all', 'new'])
  @IsOptional()
  messages?: 'all' | 'new';

  @ApiPropertyOptional({ enum: ParentChatDecisionStatus, description: 'Filter by decision status' })
  @IsEnum(ParentChatDecisionStatus)
  @IsOptional()
  decisionStatus?: ParentChatDecisionStatus;

  @ApiPropertyOptional({ example: 1, description: 'Month number (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ example: 2024, description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
