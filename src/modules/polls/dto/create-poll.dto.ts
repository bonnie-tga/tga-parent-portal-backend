import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChoiceDto {
  @ApiProperty({ example: 'Option A', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  label!: string;
}

class QuestionDto {
  @ApiProperty({ example: 'What is your preference?', maxLength: 500 })
  @IsString()
  @Length(1, 500)
  text!: string;

  @ApiProperty({ type: [ChoiceDto], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices!: ChoiceDto[];
}

export class CreatePollDto {
  @ApiProperty({ example: 'Campus Survey 2024', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'draft', description: 'Status of the poll' })
  @IsEnum(['draft', 'active', 'archived'])
  status!: 'draft' | 'active' | 'archived';

  @ApiProperty({ example: false, description: 'Target all campuses when true' })
  @IsBoolean()
  isForAllCampuses!: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Campus IDs to target (ignored if isForAllCampuses is true)',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campuses?: string[];

  @ApiPropertyOptional({ 
    type: String, 
    format: 'date-time',
    description: 'Poll date for display purposes',
    example: '2024-01-15T10:30:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  pollDate?: string;

  @ApiProperty({ example: false, description: 'Allow multiple choice selection' })
  @IsBoolean()
  isMultipleSelect!: boolean;

  @ApiProperty({ example: true, description: 'Enable comments on responses' })
  @IsBoolean()
  isCommentEnabled!: boolean;

  @ApiProperty({ type: [QuestionDto], minItems: 1 })
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  @ArrayMinSize(1)
  questions!: QuestionDto[];
}

