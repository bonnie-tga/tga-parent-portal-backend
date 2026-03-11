import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MilkFormulaEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time?: string;
}

export class RoutineEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routineComments?: string;
}

export class TransitionEvaluationEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evaluationComments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionItem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateToBeCompleted?: string;
}

export class StaffSignatureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  educator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}

export class ParentSignatureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}

export class CreateLittleAboutMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty()
  @IsMongoId()
  campusId!: string;

  @ApiProperty()
  @IsMongoId()
  roomId!: string;

  @ApiProperty()
  @IsMongoId()
  childId!: string;

  @ApiPropertyOptional({ description: 'Parent ID (required when staff creates, auto-set when parent creates)' })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialPeople?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callMother?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callFather?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enjoys?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  favoriteToy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  afraidOf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restActivity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clothingNeeds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restTimeNappies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comforters?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nappiesAllDay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toiletTraining?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedingRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  milkFormula?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  milkDetails?: string;

  @ApiPropertyOptional({ type: [MilkFormulaEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilkFormulaEntryDto)
  milkFormulaEntries?: MilkFormulaEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sleepsPerDay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sleepDuration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medication?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  developmentalPatterns?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalComments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routine?: string;

  @ApiPropertyOptional({ type: [RoutineEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineEntryDto)
  routineEntries?: RoutineEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wellnessObservationsUpToDate?: boolean;

  @ApiPropertyOptional({ type: [TransitionEvaluationEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransitionEvaluationEntryDto)
  transitionEvaluationEntries?: TransitionEvaluationEntryDto[];

  @ApiPropertyOptional({ type: ParentSignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentSignatureDto)
  signedParent?: ParentSignatureDto;

  @ApiPropertyOptional({ type: StaffSignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffSignatureDto)
  signedStaff?: StaffSignatureDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}