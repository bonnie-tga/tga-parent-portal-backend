import { IsArray, IsBoolean, IsDateString, IsEnum, IsMongoId, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { YearReportStatus } from '../schemas/year-report.schema';

export enum ApiYearReportStatus {
  DRAFT = YearReportStatus.DRAFT,
  PUBLISHED = YearReportStatus.PUBLISHED,
}

export type GroveTheoryFlags = {
  groveBody?: boolean;
  groveMind?: boolean;
  groveHeart?: boolean;
  groveCompass?: boolean;
  groveExpression?: boolean;
};

export type EducationalTheoristsFlags = {
  levVygotsky?: boolean;
  jeanPiaget?: boolean;
  johnBowlby?: boolean;
  urieBronfenbrenner?: boolean;
  howardGardner?: boolean;
  erikErikson?: boolean;
  bfSkinner?: boolean;
  albertBandura?: boolean;
  friedrichFroebel?: boolean;
  lorisMalaguzzi?: boolean;
  rudolfSteiner?: boolean;
  mariaMontessori?: boolean;
  johnDewey?: boolean;
};

export type OutcomeIdentityFlags = {
  safeSecureSupported?: boolean;
  emergingAutonomy?: boolean;
  confidentSelfIdentities?: boolean;
  interactWithCare?: boolean;
};

export type OutcomeWellbeingFlags = {
  socialEmotionalWellbeing?: boolean;
  healthPhysicalWellbeing?: boolean;
};

export type OutcomeConnectedWorldFlags = {
  senseOfBelonging?: boolean;
  respondToDiversity?: boolean;
  awareOfFairness?: boolean;
  sociallyResponsible?: boolean;
};

export type OutcomeConfidentLearnersFlags = {
  dispositionsForLearning?: boolean;
skillsAndProcesses?: boolean;
  transferAndAdapt?: boolean;
  resourceOwnLearning?: boolean;
};

export type OutcomeEffectiveCommunicatorsFlags = {
  interactVerbally?: boolean;
  engageWithText?: boolean;
  expressIdeas?: boolean;
  understandSymbols?: boolean;
  useICT?: boolean;
};

export type YearReportOutcomes = {
  identity?: OutcomeIdentityFlags;
  wellbeing?: OutcomeWellbeingFlags;
  connectedWorld?: OutcomeConnectedWorldFlags;
  confidentLearners?: OutcomeConfidentLearnersFlags;
  effectiveCommunicators?: OutcomeEffectiveCommunicatorsFlags;
};

export type AchievementGroupFlags = {
  age1to2?: boolean;
  age2to3?: boolean;
  age3to5?: boolean;
  age4to8?: boolean;
  age8to12?: boolean;
  schoolReadiness?: boolean;
};

export type YearReportMilestoneResponses = {
  [sectionId: string]: {
    [itemId: string]: 'exceeding' | 'meeting' | 'working_towards';
  };
};

export type YearReportMilestoneComments = {
  [sectionId: string]: {
    [itemId: string]: string;
  };
};

export class IndividualLearningDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  learning?: string;
}

export class CreateYearReportDto {
  @ApiProperty()
  @IsMongoId()
  campus: string;

  @ApiProperty()
  @IsMongoId()
  room: string;

  @ApiProperty()
  @IsMongoId()
  children: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  preparedBy?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  reportPeriodStart?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  reportPeriodEnd?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  developmentalSummary?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  goalEvaluation?: string;

  @ApiProperty({ type: Object })
  @IsOptional()
  @IsObject()
  groveTheory?: GroveTheoryFlags;

  @ApiProperty({ type: Object })
  @IsOptional()
  @IsObject()
  educationalTheorists?: EducationalTheoristsFlags;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  achievementGroup?: AchievementGroupFlags;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  allowTrackbacksAndPingbacks?: boolean;

  @ApiProperty({ type: Object })
  @IsOptional()
  @IsObject()
  outcomes?: YearReportOutcomes;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  milestoneResponses?: YearReportMilestoneResponses;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  milestoneComments?: YearReportMilestoneComments;

  @ApiPropertyOptional({ type: [IndividualLearningDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndividualLearningDto)
  individualLearning?: IndividualLearningDto[];

  @ApiProperty({ enum: ApiYearReportStatus, default: ApiYearReportStatus.DRAFT })
  @IsEnum(ApiYearReportStatus)
  status: ApiYearReportStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdBy?: string;
}


