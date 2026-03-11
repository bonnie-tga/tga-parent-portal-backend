import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCasualDayDto {
  @ApiProperty()
  @IsMongoId()
  campus!: string;

  @ApiProperty()
  @IsMongoId()
  room!: string;

  @ApiProperty({
    type: [String],
    description: 'Selected children identifiers',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  childrenIds!: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactNumber?: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  replaceChildOnHoliday?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string;
}




