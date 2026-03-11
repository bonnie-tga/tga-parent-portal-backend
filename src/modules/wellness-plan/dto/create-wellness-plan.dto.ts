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
  IsObject,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { WellnessPlanStatus, WellnessPlanGroup } from '../schemas/wellness-plan.schema';

export enum ApiWellnessPlanStatus {
  DRAFT = WellnessPlanStatus.DRAFT,
  PUBLISHED = WellnessPlanStatus.PUBLISHED,
}

export enum ApiWellnessPlanGroup {
  UNDER_4_MONTHS = WellnessPlanGroup.UNDER_4_MONTHS,
  FOUR_TO_EIGHT_MONTHS = WellnessPlanGroup.FOUR_TO_EIGHT_MONTHS,
  EIGHT_TO_TWELVE_MONTHS = WellnessPlanGroup.EIGHT_TO_TWELVE_MONTHS,
  ONE_TO_TWO_YEARS = WellnessPlanGroup.ONE_TO_TWO_YEARS,
  TWO_TO_THREE_YEARS = WellnessPlanGroup.TWO_TO_THREE_YEARS,
  THREE_TO_FIVE_YEARS = WellnessPlanGroup.THREE_TO_FIVE_YEARS,
  SCHOOL_LEAVERS = WellnessPlanGroup.SCHOOL_LEAVERS,
}

export type WellnessPlanGroveTheoryFlags = {
  groveBody?: boolean;
  groveMind?: boolean;
  groveHeart?: boolean;
  groveCompass?: boolean;
  groveExpression?: boolean;
};

export type WellnessPlanMilestoneResponses = {
  [sectionId: string]: {
    [itemId: string]: 'yes' | 'no' | 'wt' | '';
  };
};

export class WellnessPlanInitialPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: ['Outdoor', 'Indoor'] })
  @IsOptional()
  @IsIn(['Outdoor', 'Indoor'])
  outdoorIndoor?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  groveTheory?: WellnessPlanGroveTheoryFlags;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPlanPossibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intentionalTeaching?: string;
}

export class CreateWellnessPlanDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  childStrengthsObservedAtHome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  childCurrentInterests?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  childDesiredSkillDevelopment?: string[];

  @ApiPropertyOptional({
    enum: ApiWellnessPlanGroup,
  })
  @IsOptional()
  @IsEnum(ApiWellnessPlanGroup)
  group?: ApiWellnessPlanGroup;

  @ApiPropertyOptional({ type: [WellnessPlanInitialPlanDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WellnessPlanInitialPlanDto)
  initialPlans?: WellnessPlanInitialPlanDto[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  milestoneResponses?: WellnessPlanMilestoneResponses;

  @ApiPropertyOptional({ type: [String] })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  midYearParentTeacherMeetings?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  midYearParentTeacherMeetingsComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolLeaversExtendedComment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schoolLeaversAttachments?: string[];

  @ApiPropertyOptional({
    enum: ApiWellnessPlanStatus,
    default: ApiWellnessPlanStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ApiWellnessPlanStatus)
  status?: ApiWellnessPlanStatus;
}


