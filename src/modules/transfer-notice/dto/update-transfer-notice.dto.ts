import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTransferNoticeDto } from './create-transfer-notice.dto';
import {
  TransferNoticeDecisionStatus,
  TransferNoticeStatus,
} from '../schemas/transfer-notice.schema';

export class UpdateTransferNoticeDto extends PartialType(
  CreateTransferNoticeDto,
) {
  @ApiPropertyOptional({ enum: TransferNoticeStatus })
  @IsOptional()
  @IsEnum(TransferNoticeStatus)
  status?: TransferNoticeStatus;

  @ApiPropertyOptional({ enum: TransferNoticeDecisionStatus })
  @IsOptional()
  @IsEnum(TransferNoticeDecisionStatus)
  decisionStatus?: TransferNoticeDecisionStatus;
}

