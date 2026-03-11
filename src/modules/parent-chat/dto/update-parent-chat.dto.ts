import { IsOptional, IsEnum, IsArray, IsDateString, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ParentChatStatus, ParentChatDecisionStatus } from '../../parent-chat/schemas/parent-chat.schema';

export class UpdateParentChatDto {
  @ApiPropertyOptional({ type: [String], description: 'Member user IDs to update' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: ParentChatStatus })
  @IsEnum(ParentChatStatus)
  @IsOptional()
  status?: ParentChatStatus;

  @ApiPropertyOptional({ enum: ParentChatDecisionStatus })
  @IsEnum(ParentChatDecisionStatus)
  @IsOptional()
  decisionStatus?: ParentChatDecisionStatus;
}
