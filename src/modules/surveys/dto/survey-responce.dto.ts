import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyQuestionType } from '../enums/survey-question-type.enum';

export class SurveyQuestionAnswerDto {
  @ApiProperty({ description: 'Question ID from survey' })
  @IsString()
  @IsNotEmpty()
  surveyQuestionId: string;

  @ApiProperty({ description: 'Question from survey' })
  @IsString()
  surveyQuestion: string;

  @ApiProperty({ enum: Object.values(SurveyQuestionType), enumName: 'SurveyQuestionType' })
  @IsEnum(SurveyQuestionType)
  type: SurveyQuestionType;

  @ApiProperty({
    description: 'Answer value - string for text/dropdown, number for rating, array for multiple selections',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  @IsNotEmpty()
  @ValidateIf((o) => typeof o.surveyAnswer === 'string' || typeof o.surveyAnswer === 'number' || Array.isArray(o.surveyAnswer))
  surveyAnswer: string | number | string[];
}


export class SurveyQuestionCategoryDto {
  @ApiProperty({ description: 'Category ID from survey' })
  @IsString()
  @IsNotEmpty()
  surveyCategoryId: string;

  @ApiProperty({ description: 'Category name from survey' })
  @IsString()
  categoryName: string;

  @ApiProperty({ type: [SurveyQuestionAnswerDto], description: 'Survey question answers' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionAnswerDto)
  surveyQuestionAnswers: SurveyQuestionAnswerDto[];
}

export class SurveyResponseDto {
  @ApiProperty({ description: 'Survey ID' })
  @IsMongoId()
  surveyId: string;

  @ApiProperty({ description: 'Campus ID where the survey is being answered' })
  @IsMongoId()
  campusId: string;

  @ApiProperty({ type: [SurveyQuestionCategoryDto], description: 'Survey question category answers' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionCategoryDto)
  surveyQuestionCategory: SurveyQuestionCategoryDto[];

  @ApiProperty({ description: 'Mark survey as completed', required: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
