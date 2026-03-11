import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SurveyQuestionType } from '../enums/survey-question-type.enum';

export class SurveyQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ enum: Object.values(SurveyQuestionType), enumName: 'SurveyQuestionType' })
  @IsEnum(SurveyQuestionType)
  type: SurveyQuestionType;

  @ApiProperty({
    description: 'Options for multiple choice / dropdown questions',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsOptional()
  options?: string[];
}

export class SurveyCategoryDto {
  @ApiProperty({ description: 'Category/group name' })
  @IsString()
  categoryName: string;

  @ApiProperty({ type: [SurveyQuestionDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions: SurveyQuestionDto[];
}
