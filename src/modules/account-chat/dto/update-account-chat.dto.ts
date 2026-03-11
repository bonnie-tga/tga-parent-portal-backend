import { IsOptional, IsEnum, IsArray, IsDateString, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountChatStatus, AccountChatDecisionStatus } from '../schemas/account-chat.schema';

export class UpdateAccountChatDto {
  @ApiPropertyOptional({ type: [String], description: 'Member user IDs to update' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  members?: string[];

  @ApiPropertyOptional({ enum: AccountChatStatus })
  @IsEnum(AccountChatStatus)
  @IsOptional()
  status?: AccountChatStatus;

  @ApiPropertyOptional({ enum: AccountChatDecisionStatus })
  @IsEnum(AccountChatDecisionStatus)
  @IsOptional()
  decisionStatus?: AccountChatDecisionStatus;
}
