import { IsString, IsMongoId, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountChatStatus, AccountChatDecisionStatus } from '../schemas/account-chat.schema';

export class CreateAccountChatDto {
  @ApiProperty({ description: 'Child ID' })
  @IsString()
  @IsMongoId()
  children: string;

  @ApiPropertyOptional({ description: 'Campus ID (optional - will auto-collect all campuses from children)' })
  @IsString()
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({ description: 'Room ID (optional - will auto-collect all rooms from children)' })
  @IsString()
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ type: [String], description: 'Member user IDs (auto from child parents and Admin / Area Manager / Enrolment)' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: AccountChatStatus, default: AccountChatStatus.DRAFT })
  @IsEnum(AccountChatStatus)
  @IsOptional()
  status?: AccountChatStatus;

  @ApiPropertyOptional({ enum: AccountChatDecisionStatus, default: AccountChatDecisionStatus.OPEN })
  @IsEnum(AccountChatDecisionStatus)
  @IsOptional()
  decisionStatus?: AccountChatDecisionStatus;
}
