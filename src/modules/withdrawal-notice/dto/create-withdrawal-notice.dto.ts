import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  WithdrawalNoticeDecisionStatus,
  WithdrawalNoticeHappyWithService,
  WithdrawalNoticeReason,
  WithdrawalNoticeStatus,
} from '../schemas/withdrawal-notice.schema';

export class CreateWithdrawalNoticeDto {
  @ApiProperty()
  @IsMongoId()
  campus!: string;

  @ApiProperty()
  @IsMongoId()
  room!: string;

  @ApiProperty({
    type: [String],
    description: 'Selected children identifiers',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  childrenIds!: string[];

  @ApiProperty()
  @IsString()
  parentName!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactNumber?: string;

  @ApiProperty()
  @IsDateString()
  dateNoticeGiven!: string;

  @ApiProperty()
  @IsDateString()
  lastDayOfAttendance!: string;

  @ApiProperty({ enum: WithdrawalNoticeReason })
  @IsEnum(WithdrawalNoticeReason)
  reason!: WithdrawalNoticeReason;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  newCentre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  other?: string;

  @ApiPropertyOptional({ enum: WithdrawalNoticeHappyWithService })
  @IsEnum(WithdrawalNoticeHappyWithService)
  @IsOptional()
  happyWithService?: WithdrawalNoticeHappyWithService;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ enum: WithdrawalNoticeStatus })
  @IsEnum(WithdrawalNoticeStatus)
  @IsOptional()
  status?: WithdrawalNoticeStatus;

  @ApiPropertyOptional({ enum: WithdrawalNoticeDecisionStatus })
  @IsEnum(WithdrawalNoticeDecisionStatus)
  @IsOptional()
  decisionStatus?: WithdrawalNoticeDecisionStatus;
}




