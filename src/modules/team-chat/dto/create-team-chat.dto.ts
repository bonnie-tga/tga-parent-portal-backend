import { IsNotEmpty, IsMongoId, IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamChatStatus, TeamChatDecisionStatus } from '../schemas/team-chat.schema';

export class CreateTeamChatDto {
  @ApiProperty({ description: 'Team chat title', example: 'Management Team' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Campus ID', example: '507f1f77bcf86cd799439012' })
  @IsNotEmpty()
  @IsMongoId()
  campus: string;

  @ApiPropertyOptional({ description: 'Director/AD/EL user IDs', type: [String], example: ['507f1f77bcf86cd799439011'] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  directorAdEl?: string[];

  @ApiPropertyOptional({ description: 'Admin/Area Manager user IDs', type: [String], example: ['507f1f77bcf86cd799439010'] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  adminAreaManager?: string[];

  @ApiPropertyOptional({ description: 'Team chat status', enum: TeamChatStatus, default: TeamChatStatus.DRAFT })
  @IsOptional()
  @IsEnum(TeamChatStatus)
  status?: TeamChatStatus;

  @ApiPropertyOptional({ description: 'Decision status', enum: TeamChatDecisionStatus, default: TeamChatDecisionStatus.OPEN })
  @IsOptional()
  @IsEnum(TeamChatDecisionStatus)
  decisionStatus?: TeamChatDecisionStatus;
}
