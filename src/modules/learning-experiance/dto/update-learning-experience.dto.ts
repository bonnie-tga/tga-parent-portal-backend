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
import { LearningExperianceCategoryDto } from './create-learning-experiance.dto';

export class UpdateLearningExperienceDto {
  @ApiProperty({
    description: 'Selected date to identify the week (will load Mon-Fri of that week)',
    example: '2025-10-10',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

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
    description: 'Week beginning date',
    example: '2025-11-17',
  })
  @IsOptional()
  @IsDateString()
  weekBeginning?: string;

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

