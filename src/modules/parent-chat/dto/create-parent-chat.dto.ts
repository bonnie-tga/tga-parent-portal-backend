import { IsString, IsMongoId, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentChatStatus, ParentChatDecisionStatus } from '../../parent-chat/schemas/parent-chat.schema';

export class CreateParentChatDto {
  @ApiProperty({ description: 'Child ID' })
  @IsString()
  @IsMongoId()
  children: string;

  @ApiProperty({ description: 'Campus ID' })
  @IsString()
  @IsMongoId()
  campus: string;

  @ApiProperty({ description: 'Room ID' })
  @IsString()
  @IsMongoId()
  room: string;

  @ApiPropertyOptional({ type: [String], description: 'Member user IDs (auto from child parents and room users if not provided)' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: ParentChatStatus, default: ParentChatStatus.DRAFT })
  @IsEnum(ParentChatStatus)
  @IsOptional()
  status?: ParentChatStatus;

  @ApiPropertyOptional({ enum: ParentChatDecisionStatus, default: ParentChatDecisionStatus.OPEN })
  @IsEnum(ParentChatDecisionStatus)
  @IsOptional()
  decisionStatus?: ParentChatDecisionStatus;
}
