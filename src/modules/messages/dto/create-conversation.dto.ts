import { IsEnum, IsMongoId, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../schemas/conversation.schema';

export class CreateConversationDto {
  @ApiProperty({
    enum: ConversationType,
    description: 'Type of conversation',
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of user IDs who are participants in this conversation',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  participants?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Child ID if the conversation is about a specific child',
  })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Room ID if the conversation is related to a specific room',
  })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Campus ID if the conversation is related to a specific campus',
  })
  @IsMongoId()
  @IsOptional()
  campus?: string;
}
