import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCasualDayDto } from './create-casual-day.dto';
import {
  CasualDayDecisionStatus,
  CasualDayStatus,
} from '../schemas/casual-day.schema';

export class UpdateCasualDayDto extends PartialType(CreateCasualDayDto) {
  @ApiPropertyOptional({ enum: CasualDayStatus })
  @IsOptional()
  @IsEnum(CasualDayStatus)
  status?: CasualDayStatus;

  @ApiPropertyOptional({ enum: CasualDayDecisionStatus })
  @IsOptional()
  @IsEnum(CasualDayDecisionStatus)
  decisionStatus?: CasualDayDecisionStatus;
}




