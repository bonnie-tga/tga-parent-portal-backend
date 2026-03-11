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
  ChangeAttendanceDay,
  ChangeAttendanceDecisionStatus,
} from '../schemas/change-attendance.schema';

export class CreateChangeAttendanceDto {
  @ApiProperty()
  @IsMongoId()
  campusId!: string;

  @ApiProperty()
  @IsMongoId()
  roomId!: string;

  @ApiProperty()
  @IsMongoId()
  childId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactNumber?: string;

  @ApiProperty({
    type: [String],
    enum: ChangeAttendanceDay,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ChangeAttendanceDay, { each: true })
  days!: ChangeAttendanceDay[];

  @ApiProperty()
  @IsDateString()
  commenceOn!: string;

  @ApiPropertyOptional({ enum: ChangeAttendanceDecisionStatus })
  @IsEnum(ChangeAttendanceDecisionStatus)
  @IsOptional()
  decisionStatus?: ChangeAttendanceDecisionStatus;
}


