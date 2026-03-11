import { ArrayNotEmpty, IsArray, IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Months, Years } from '../../grove-curriculum/schemas/grove-curriculum.schema';

export class GenerateOutdoorLearningPdfDto {
  @ApiProperty({
    description: 'Month',
    enum: Months,
    example: Months.NOVEMBER,
  })
  @IsEnum(Months)
  @IsNotEmpty()
  month: Months;

  @ApiProperty({
    description: 'Year',
    enum: Years,
    example: Years.Y2025,
  })
  @IsEnum(Years)
  @IsNotEmpty()
  year: Years;

  @ApiProperty({
    description: 'Campus ID',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiProperty({
    description: 'Room IDs (can be single value or array). Multiple rooms can be sent as ?rooms=id1&rooms=id2',
    type: [String],
    example: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
  })
  @Transform(({ value }) => {
    // If value is already an array, return it
    if (Array.isArray(value)) {
      return value;
    }
    // If value is a string, convert it to array
    if (typeof value === 'string') {
      return [value];
    }
    // If value is undefined or null, return empty array (will fail validation)
    return [];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  rooms: string[];
}

