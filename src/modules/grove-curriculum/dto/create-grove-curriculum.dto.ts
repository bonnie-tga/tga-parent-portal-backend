import {
  IsArray,
  IsBoolean,
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
import {
  GroveCurriculumStatus,
  Months,
  Years,
} from '../schemas/grove-curriculum.schema';

export class EnvironmentDto {
  @ApiPropertyOptional({
    description: 'Date for environment',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Purpose of environment',
    example: 'Create a calm learning space',
  })
  @IsOptional()
  @IsString()
  purpose?: string;
  
  @ApiPropertyOptional({
    description: 'School Readiness checkbox (only visible if room age is 3-5)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  schoolReadiness?: boolean;
}

export class SpontaneousLearningDto {
  @ApiPropertyOptional({
    description: 'Date for spontaneous learning',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Title of spontaneous learning',
    example: 'Children exploring shapes',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

export class OutdoorLearningDto {
  @ApiPropertyOptional({
    description: 'Date for outdoor learning',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Purpose of outdoor learning',
    example: 'Nature exploration activity',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Array of child IDs participating in outdoor learning',
    type: [String],
    example: ['60d0fe4f5311236168a109ca', '60d0fe4f5311236168a109cb'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  children?: string[];
}

export class GroveCategoryDto {
  @ApiPropertyOptional({
    description: 'Array of environment entries',
    type: [EnvironmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentDto)
  environment?: EnvironmentDto[];

  @ApiPropertyOptional({
    description: 'Array of spontaneous learning entries',
    type: [SpontaneousLearningDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpontaneousLearningDto)
  spontaneousLearning?: SpontaneousLearningDto[];

  @ApiPropertyOptional({
    description: 'Array of outdoor learning entries',
    type: [OutdoorLearningDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutdoorLearningDto)
  outdoorLearning?: OutdoorLearningDto[];
}

export class CreateGroveCurriculumDto {
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

  @ApiProperty({
    description: 'Status of the curriculum',
    enum: GroveCurriculumStatus,
    example: GroveCurriculumStatus.DRAFT,
  })
  @IsEnum(GroveCurriculumStatus)
  @IsNotEmpty()
  status: GroveCurriculumStatus;
}

