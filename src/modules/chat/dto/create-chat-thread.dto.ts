import { IsEnum, IsMongoId, IsOptional, IsArray, IsObject, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../schemas/chat-thread.schema';

export class CreateChatThreadDto {
  @ApiProperty({ enum: ChatThreadType, description: 'Chat thread type' })
  @IsEnum(ChatThreadType)
  type: ChatThreadType;

  @ApiPropertyOptional({ description: 'Reference ID to source entity (e.g., ParentChat._id)' })
  @IsMongoId()
  @IsOptional()
  refId?: string;

  @ApiPropertyOptional({ 
    enum: ['ParentChat', 'AccountChat', 'TeamChat', 'ManagementChat', 'StaffChat'],
    description: 'Reference model name for dynamic population' 
  })
  @IsEnum(['ParentChat', 'AccountChat', 'TeamChat', 'ManagementChat', 'StaffChat'])
  @IsOptional()
  refModel?: string;

  @ApiPropertyOptional({ description: 'Campus ID (required for PARENT, optional for others)' })
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room ID (required for PARENT, STAFF)' })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ type: [String], description: 'Member user IDs (required for non-parent chats)' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: ChatThreadStatus, default: ChatThreadStatus.DRAFT })
  @IsEnum(ChatThreadStatus)
  @IsOptional()
  status?: ChatThreadStatus;

  @ApiPropertyOptional({ enum: ChatThreadDecisionStatus, default: ChatThreadDecisionStatus.OPEN })
  @IsEnum(ChatThreadDecisionStatus)
  @IsOptional()
  decisionStatus?: ChatThreadDecisionStatus;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON object)' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
