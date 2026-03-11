import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroveCategory } from '../schemas/learning-experiance.schema';

export class LearningExperianceCategoryDto {
  @ApiPropertyOptional({
    description: 'Date of the activity',
    example: '2025-11-17',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Question for the activity',
    example: 'What did the children explore today?',
  })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({
    description: 'Experience description',
    example: 'The children enjoyed exploring shapes and colors in the outdoor area.',
  })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({
    description: 'Array of selected Grove categories',
    enum: GroveCategory,
    isArray: true,
    example: [GroveCategory.GROVE_BODY, GroveCategory.GROVE_MIND],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(GroveCategory, { each: true })
  groveCategories?: GroveCategory[];
}

export class CreateLearningExperianceDto {
  @ApiPropertyOptional({
    description: 'Week beginning date',
    example: '2025-11-17',
  })
  @IsOptional()
  @IsDateString()
  weekBeginning?: string;

  @ApiProperty({
    description: 'Campus ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiProperty({
    description: 'Room ID',
    example: '60d0fe4f5311236168a109cb',
  })
  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @ApiPropertyOptional({
    description: 'Array of activities for different dates',
    type: [LearningExperianceCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningExperianceCategoryDto)
  activities?: LearningExperianceCategoryDto[];
}

