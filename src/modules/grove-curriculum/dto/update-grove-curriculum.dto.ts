import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  GroveCurriculumStatus,
  Months,
  Years,
} from '../schemas/grove-curriculum.schema';
import { EnvironmentDto, SpontaneousLearningDto, OutdoorLearningDto, GroveCategoryDto } from './create-grove-curriculum.dto';

export class UpdateGroveCurriculumDto {
  @ApiPropertyOptional({
    description: 'Month of the curriculum',
    enum: Months,
    example: Months.JANUARY,
  })
  @IsOptional()
  @IsEnum(Months)
  month?: Months;

  @ApiPropertyOptional({
    description: 'Year of the curriculum',
    enum: Years,
    example: Years.Y2025,
  })
  @IsOptional()
  @IsEnum(Years)
  year?: Years;

  @ApiPropertyOptional({
    description: 'Campus ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({
    description: 'Room ID',
    example: '60d0fe4f5311236168a109cb',
  })
  @IsOptional()
  @IsMongoId()
  room?: string;

  @ApiPropertyOptional({
    description: 'Array of Grove Body categories',
    type: [GroveCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroveCategoryDto)
  groveBody?: GroveCategoryDto[];

  @ApiPropertyOptional({
    description: 'Array of Grove Mind categories',
    type: [GroveCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroveCategoryDto)
  groveMind?: GroveCategoryDto[];

  @ApiPropertyOptional({
    description: 'Array of Grove Heart categories',
    type: [GroveCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroveCategoryDto)
  groveHeart?: GroveCategoryDto[];

  @ApiPropertyOptional({
    description: 'Array of Grove Compass categories',
    type: [GroveCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroveCategoryDto)
  groveCompass?: GroveCategoryDto[];

  @ApiPropertyOptional({
    description: 'Array of Grove Expression categories',
    type: [GroveCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroveCategoryDto)
  groveExpression?: GroveCategoryDto[];

  @ApiPropertyOptional({
    description: 'Where to next section',
    example: 'Next steps for improvement...',
  })
  @IsOptional()
  @IsString()
  whereToNext?: string;

  @ApiPropertyOptional({
    description: 'School Readiness Focus Point (only visible if room age is 3-5)',
    example: 'Focus on developing fine motor skills...',
  })
  @IsOptional()
  @IsString()
  schoolReadinessFocusPoint?: string;

  @ApiPropertyOptional({
    description: 'Status of the curriculum',
    enum: GroveCurriculumStatus,
    example: GroveCurriculumStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(GroveCurriculumStatus)
  status?: GroveCurriculumStatus;
}

