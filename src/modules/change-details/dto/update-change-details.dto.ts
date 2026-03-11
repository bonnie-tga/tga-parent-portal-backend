import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateChangeDetailsDto } from './create-change-details.dto';
import {
  ChangeDetailsDecisionStatus,
  ChangeDetailsStatus,
} from '../schemas/change-details.schema';

export class UpdateChangeDetailsDto extends PartialType(
  CreateChangeDetailsDto,
) {
  @ApiPropertyOptional({ enum: ChangeDetailsStatus })
  @IsOptional()
  @IsEnum(ChangeDetailsStatus)
  status?: ChangeDetailsStatus;

  @ApiPropertyOptional({ enum: ChangeDetailsDecisionStatus })
  @IsOptional()
  @IsEnum(ChangeDetailsDecisionStatus)
  decisionStatus?: ChangeDetailsDecisionStatus;
}




