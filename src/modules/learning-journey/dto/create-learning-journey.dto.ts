import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LearningJourneyStatus } from '../schemas/learning-journey.schema';

export enum ApiLearningJourneyStatus {
  DRAFT = LearningJourneyStatus.DRAFT,
  PUBLISHED = LearningJourneyStatus.PUBLISHED,
}

export type LearningJourneyEducationalTheoristsFlags = {
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

export type LearningJourneyOutcomeIdentityFlags = {
  safeSecureSupported?: boolean;
  emergingAutonomy?: boolean;
  confidentSelfIdentities?: boolean;
  interactWithCare?: boolean;
};

export type LearningJourneyOutcomeConnectedWorldFlags = {
  senseOfBelonging?: boolean;
  respondToDiversity?: boolean;
  awareOfFairness?: boolean;
  sociallyResponsible?: boolean;
};

export type LearningJourneyOutcomeWellbeingFlags = {
  socialEmotionalWellbeing?: boolean;
  physicalWellbeing?: boolean;
  mentalPhysicalHealth?: boolean;
};

export type LearningJourneyOutcomeConfidentLearnersFlags = {
  dispositionsForLearning?: boolean;
  skillsAndProcesses?: boolean;
  transferAndAdapt?: boolean;
  resourceOwnLearning?: boolean;
};

export type LearningJourneyOutcomeEffectiveCommunicatorsFlags = {
  interactVerbally?: boolean;
  engageWithText?: boolean;
  expressIdeas?: boolean;
  understandSymbols?: boolean;
  useDigitalTechnologies?: boolean;
};

export type LearningJourneyOutcomes = {
  identity?: LearningJourneyOutcomeIdentityFlags;
  connectedWorld?: LearningJourneyOutcomeConnectedWorldFlags;
  wellbeing?: LearningJourneyOutcomeWellbeingFlags;
  confidentLearners?: LearningJourneyOutcomeConfidentLearnersFlags;
  effectiveCommunicators?: LearningJourneyOutcomeEffectiveCommunicatorsFlags;
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

export class SpontaneousLearningDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class LearningJourneyFuturePlanningItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  possibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intentionalTeaching?: string;
}

export class GoalEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goalEvaluationsId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evaluation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}

export class CreateLearningJourneyDto {
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
  @IsDateString()
  publishedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monthOne?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monthTwo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({ type: [IndividualLearningDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndividualLearningDto)
  individualLearning?: IndividualLearningDto[];

  @ApiPropertyOptional({ type: [SpontaneousLearningDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpontaneousLearningDto)
  spontaneousLearning?: SpontaneousLearningDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousStrengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newStrengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newInterests?: string;

  @ApiPropertyOptional({ type: [GoalEvaluationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalEvaluationDto)
  goalEvaluations?: GoalEvaluationDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newGoals?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  commentCount?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  educationalTheorists?: LearningJourneyEducationalTheoristsFlags;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  outcomes?: LearningJourneyOutcomes;

  @ApiPropertyOptional({ type: [LearningJourneyFuturePlanningItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningJourneyFuturePlanningItemDto)
  futurePlanning?: LearningJourneyFuturePlanningItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  completedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowTrackbacks?: boolean;

  @ApiPropertyOptional({
    enum: ApiLearningJourneyStatus,
    default: ApiLearningJourneyStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ApiLearningJourneyStatus)
  status?: ApiLearningJourneyStatus;
}


