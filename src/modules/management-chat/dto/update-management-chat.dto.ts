import { IsOptional, IsEnum, IsArray, IsDateString, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ManagementChatStatus, ManagementChatDecisionStatus } from '../schemas/management-chat.schema';

export class UpdateManagementChatDto {
  @ApiPropertyOptional({ type: [String], description: 'Member user IDs to update' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: ManagementChatStatus })
  @IsEnum(ManagementChatStatus)
  @IsOptional()
  status?: ManagementChatStatus;

  @ApiPropertyOptional({ enum: ManagementChatDecisionStatus })
  @IsEnum(ManagementChatDecisionStatus)
  @IsOptional()
  decisionStatus?: ManagementChatDecisionStatus;
}
