import { IsEnum, IsOptional, IsString, IsInt, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../schemas/chat-thread.schema';

export class QueryChatThreadDto {
  @ApiPropertyOptional({ enum: ChatThreadType, description: 'Filter by chat type' })
  @IsEnum(ChatThreadType)
  @IsOptional()
  type?: ChatThreadType;

  @ApiPropertyOptional({ description: 'Filter by campus' })
  @IsString()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({ description: 'Filter by room' })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ enum: ChatThreadStatus, description: 'Filter by status' })
  @IsEnum(ChatThreadStatus)
  @IsOptional()
  status?: ChatThreadStatus;

  @ApiPropertyOptional({ enum: ChatThreadDecisionStatus, description: 'Filter by decision status' })
  @IsEnum(ChatThreadDecisionStatus)
  @IsOptional()
  decisionStatus?: ChatThreadDecisionStatus;

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
