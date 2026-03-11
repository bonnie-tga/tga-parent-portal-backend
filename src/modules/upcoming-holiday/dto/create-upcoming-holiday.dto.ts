import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateUpcomingHolidayDto {
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

  @ApiProperty()
  @IsInt()
  @Min(1)
  numberOfDays!: number;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string;
}




