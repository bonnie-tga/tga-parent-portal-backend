import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWithdrawalNoticeDto } from './create-withdrawal-notice.dto';
import {
  WithdrawalNoticeDecisionStatus,
  WithdrawalNoticeStatus,
} from '../schemas/withdrawal-notice.schema';

export class UpdateWithdrawalNoticeDto extends PartialType(
  CreateWithdrawalNoticeDto,
) {
  @ApiPropertyOptional({ enum: WithdrawalNoticeStatus })
  @IsOptional()
  @IsEnum(WithdrawalNoticeStatus)
  status?: WithdrawalNoticeStatus;

  @ApiPropertyOptional({ enum: WithdrawalNoticeDecisionStatus })
  @IsOptional()
  @IsEnum(WithdrawalNoticeDecisionStatus)
  decisionStatus?: WithdrawalNoticeDecisionStatus;
}




