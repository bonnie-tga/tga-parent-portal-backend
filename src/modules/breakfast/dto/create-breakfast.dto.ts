import { IsArray, IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BreakfastStatus, BreakfastVisibility } from '../schemas/breakfast.schema';

class BreakfastChildEntryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Child ID',
  })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Breakfast',
  })
  @IsString()
  breakfast?: string;
}

export class CreateBreakfastDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Campus ID',
  })
  @IsMongoId()
  campus: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Date',
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    type: [BreakfastChildEntryDto],
    description: 'Children entries',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakfastChildEntryDto)
  @IsOptional()
  childrenEntries?: BreakfastChildEntryDto[];

  @ApiPropertyOptional({
    enum: BreakfastStatus,
    description: 'Status',
  })
  @IsEnum(BreakfastStatus)
  @IsNotEmpty()
  status: BreakfastStatus;

  @ApiPropertyOptional({
    enum: BreakfastVisibility,
    description: 'Visibility',
  })
  @IsEnum(BreakfastVisibility)
  @IsNotEmpty()
  visibility: BreakfastVisibility;

  @ApiPropertyOptional({
    type: String,
    description: 'Published date',
  })
  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Created by',
  })
  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Updated by',
  })
  @IsMongoId()
  @IsOptional()
  updatedBy?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Is deleted',
  })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}


