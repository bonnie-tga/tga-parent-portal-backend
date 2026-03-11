import { IsString, IsMongoId, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ManagementChatStatus, ManagementChatDecisionStatus } from '../schemas/management-chat.schema';

export class CreateManagementChatDto {
  @ApiProperty({ description: 'Child ID' })
  @IsString()
  @IsMongoId()
  children: string;

  @ApiProperty({ description: 'Campus ID (required - will auto-collect all campuses from children)' })
  @IsString()
  @IsMongoId()
  campus: string;

  @ApiPropertyOptional({ description: 'Room ID (optional - will auto-collect all rooms from children)' })
  @IsString()
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ type: [String], description: 'Member user IDs (auto from child parents and Management users from selected campus)' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: ManagementChatStatus, default: ManagementChatStatus.DRAFT })
  @IsEnum(ManagementChatStatus)
  @IsOptional()
  status?: ManagementChatStatus;

  @ApiPropertyOptional({ enum: ManagementChatDecisionStatus, default: ManagementChatDecisionStatus.OPEN })
  @IsEnum(ManagementChatDecisionStatus)
  @IsOptional()
  decisionStatus?: ManagementChatDecisionStatus;
}
