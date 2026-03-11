import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateChangeAttendanceDto } from './create-change-attendance.dto';
import {
  ChangeAttendanceDecisionStatus,
  ChangeAttendanceStatus,
} from '../schemas/change-attendance.schema';

export class UpdateChangeAttendanceDto extends PartialType(
  CreateChangeAttendanceDto,
) {
  @ApiPropertyOptional({ enum: ChangeAttendanceStatus })
  @IsOptional()
  @IsEnum(ChangeAttendanceStatus)
  status?: ChangeAttendanceStatus;

  @ApiPropertyOptional({ enum: ChangeAttendanceDecisionStatus })
  @IsOptional()
  @IsEnum(ChangeAttendanceDecisionStatus)
  decisionStatus?: ChangeAttendanceDecisionStatus;
}


