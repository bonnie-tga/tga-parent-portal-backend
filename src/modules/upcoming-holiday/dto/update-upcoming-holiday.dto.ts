import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUpcomingHolidayDto } from './create-upcoming-holiday.dto';
import {
  UpcomingHolidayDecisionStatus,
  UpcomingHolidayStatus,
} from '../schemas/upcoming-holiday.schema';

export class UpdateUpcomingHolidayDto extends PartialType(
  CreateUpcomingHolidayDto,
) {
  @ApiPropertyOptional({ enum: UpcomingHolidayStatus })
  @IsOptional()
  @IsEnum(UpcomingHolidayStatus)
  status?: UpcomingHolidayStatus;

  @ApiPropertyOptional({ enum: UpcomingHolidayDecisionStatus })
  @IsOptional()
  @IsEnum(UpcomingHolidayDecisionStatus)
  decisionStatus?: UpcomingHolidayDecisionStatus;
}




