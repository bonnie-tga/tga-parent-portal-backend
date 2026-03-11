import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SurveyCategoryDto } from './survey-question.dto';
import { SurveyStatus } from '../enums/survey-status.enum';

export class CreateSurveyDto {
  @ApiProperty({ description: 'Survey title' })
  @IsString()
  title: string;

  @ApiProperty({ type: [String], description: 'Target campus IDs', required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campusIds?: string[];

  @ApiProperty({ description: 'Scheduled date for survey availability', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Survey category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ type: [SurveyCategoryDto], description: 'Survey questions categorized' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SurveyCategoryDto)
  surveyQuestions: SurveyCategoryDto[];

  @ApiProperty({ description: 'Flag indicating feedback has been actioned', required: false })
  @IsOptional()
  @IsBoolean()
  feedbackActioned?: boolean;

  @ApiProperty({ enum: Object.values(SurveyStatus), enumName: 'SurveyStatus', default: 'draft' })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;
}
