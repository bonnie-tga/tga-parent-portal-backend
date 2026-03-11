import { IsArray, IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DailyJournalStatus, DailyJournalVisibility, GroveTheory } from '../schemas/daily-journal.schema';

class OutcomeSelectionDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  identity?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  connected?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  wellbeing?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learners?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  communicators?: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  critical?: string[] = [];
}

class EducationTheoryDto {
  @IsOptional()
  @IsBoolean()
  levVygotsky?: boolean;

  @IsOptional()
  @IsBoolean()
  jeanPiaget?: boolean;

  @IsOptional()
  @IsBoolean()
  johnBowlby?: boolean;

  @IsOptional()
  @IsBoolean()
  urieBronfenbrenner?: boolean;

  @IsOptional()
  @IsBoolean()
  howardGardner?: boolean;

  @IsOptional()
  @IsBoolean()
  erikErikson?: boolean;

  @IsOptional()
  @IsBoolean()
  bfSkinner?: boolean;

  @IsOptional()
  @IsBoolean()
  albertBandura?: boolean;

  @IsOptional()
  @IsBoolean()
  friedrichFroebel?: boolean;

  @IsOptional()
  @IsBoolean()
  lorisMalaguzzi?: boolean;

  @IsOptional()
  @IsBoolean()
  rudolfSteiner?: boolean;

  @IsOptional()
  @IsBoolean()
  mariaMontessori?: boolean;

  @IsOptional()
  @IsBoolean()
  johnDewey?: boolean;
}

class IndividualLearningDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  children?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  learning?: string;
}

class SpontaneousLearningDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  purpose?: string;


  @IsOptional()
  @IsArray()
  @IsEnum(GroveTheory, { each: true })
  groveTheory?: GroveTheory[];
  
  @IsOptional()
  @IsBoolean()
  isAddToCurriculum?: boolean;
}

class ExperienceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(GroveTheory, { each: true })
  groveTheory?: GroveTheory[];
}
  

export class CreateDailyJournalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @IsOptional()
  @IsMongoId()
  roomId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  child?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  teachingTeam?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndividualLearningDto)
  individualLearning?: IndividualLearningDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpontaneousLearningDto)
  spontaneousLearning?: SpontaneousLearningDto[];

  @IsOptional()
  @IsMongoId()
  completedByName?: string;

  @IsOptional()
  @IsString()
  educationalLeaderComment?: string;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowTrackbacks?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EducationTheoryDto)
  educationalTheorists?: EducationTheoryDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OutcomeSelectionDto)
  selectedOutcomes?: OutcomeSelectionDto;

  @IsOptional()
  @IsEnum(DailyJournalStatus)
  status?: DailyJournalStatus;

  @IsOptional()
  @IsEnum(DailyJournalVisibility)
  visibility?: DailyJournalVisibility;

  @IsOptional()
  @IsDateString()
  scheduleAt?: string;
}


