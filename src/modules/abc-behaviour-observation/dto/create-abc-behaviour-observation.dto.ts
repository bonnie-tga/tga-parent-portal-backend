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
  AbcBehaviourObservationStatus,
} from '../schemas/abc-behaviour-observation.schema';

export class AbcBehaviourObservationEntryDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  data?: string;
}

export enum ApiAbcBehaviourObservationStatus {
  DRAFT = AbcBehaviourObservationStatus.DRAFT,
  PUBLISHED = AbcBehaviourObservationStatus.PUBLISHED,
}

export class CreateAbcBehaviourObservationDto {
  @ApiProperty()
  @IsMongoId()
  campus!: string;

  @ApiProperty()
  @IsMongoId()
  room!: string;

  @ApiProperty()
  @IsMongoId()
  children!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ type: [AbcBehaviourObservationEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbcBehaviourObservationEntryDto)
  observationEntries?: AbcBehaviourObservationEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortTermGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  longTermGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  behaviourRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuesSituations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskMitigation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resources?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeFrame?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strategies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evaluation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentsAdditionalActionItems?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowTrackbacks?: boolean;

  @ApiPropertyOptional({
    enum: ApiAbcBehaviourObservationStatus,
    default: ApiAbcBehaviourObservationStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ApiAbcBehaviourObservationStatus)
  status?: ApiAbcBehaviourObservationStatus;
}


