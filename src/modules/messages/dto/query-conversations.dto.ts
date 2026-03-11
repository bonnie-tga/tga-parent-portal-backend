import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../schemas/conversation.schema';

export class QueryConversationsDto {
  @ApiPropertyOptional({
    enum: ConversationType,
    description: 'Filter by conversation type',
  })
  @IsEnum(ConversationType)
  @IsOptional()
  type?: ConversationType;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by child ID',
  })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by room ID',
  })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by campus ID',
  })
  @IsMongoId()
  @IsOptional()
  campus?: string;
}
