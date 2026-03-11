import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  SchoolReadinessChecklistStatus,
  SchoolReadinessChecklistValue,
} from '../schemas/school-readiness-checklist.schema';

export class SchoolReadinessChecklistItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  question!: string;

  @ApiPropertyOptional({ enum: SchoolReadinessChecklistValue })
  @IsOptional()
  @IsEnum(SchoolReadinessChecklistValue)
  value?: SchoolReadinessChecklistValue;
}


export enum ApiSchoolReadinessChecklistStatus {
  DRAFT = SchoolReadinessChecklistStatus.DRAFT,
  PUBLISHED = SchoolReadinessChecklistStatus.PUBLISHED,
}

export class CreateSchoolReadinessChecklistDto {
  @ApiProperty()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty()
  @IsMongoId()
  campus!: string;

  @ApiProperty()
  @IsMongoId()
  room!: string;

  @ApiProperty()
  @IsMongoId()
  children!: string;

  @ApiPropertyOptional({ type: [SchoolReadinessChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchoolReadinessChecklistItemDto)
  checklist?: SchoolReadinessChecklistItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extendedComment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowTrackbacks?: boolean;

  @ApiPropertyOptional({
    enum: ApiSchoolReadinessChecklistStatus,
    default: ApiSchoolReadinessChecklistStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ApiSchoolReadinessChecklistStatus)
  status?: ApiSchoolReadinessChecklistStatus;
}


