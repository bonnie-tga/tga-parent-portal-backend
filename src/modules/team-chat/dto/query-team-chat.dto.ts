import { IsOptional, IsMongoId, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TeamChatStatus } from '../schemas/team-chat.schema';

export class QueryTeamChatDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by campus ID', example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Filter by campus ID (alias for campusId)', example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: TeamChatStatus })
  @IsOptional()
  @IsEnum(TeamChatStatus)
  status?: TeamChatStatus;

  @ApiPropertyOptional({ description: 'Search by team name' })
  @IsOptional()
  search?: string;
}
