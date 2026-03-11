import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TransferNoticeDecisionStatus,
  TransferNoticeStatus,
} from '../schemas/transfer-notice.schema';

export class CreateTransferNoticeDto {
  @ApiProperty({
    type: [String],
    description: 'Selected children identifiers',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  childrenIds!: string[];

  @ApiProperty({ description: 'Old campus identifier' })
  @IsMongoId()
  oldCampusId!: string;

  @ApiProperty({ description: 'New campus identifier' })
  @IsMongoId()
  newCampusId!: string;

  @ApiPropertyOptional({
    description: 'Optional link or reference to related withdrawal notice',
  })
  @IsString()
  @IsOptional()
  linkToWithdrawalNotice?: string;

  @ApiPropertyOptional({ enum: TransferNoticeStatus })
  @IsEnum(TransferNoticeStatus)
  @IsOptional()
  status?: TransferNoticeStatus;

  @ApiPropertyOptional({ enum: TransferNoticeDecisionStatus })
  @IsEnum(TransferNoticeDecisionStatus)
  @IsOptional()
  decisionStatus?: TransferNoticeDecisionStatus;
}

