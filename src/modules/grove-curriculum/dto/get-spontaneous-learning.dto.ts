import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Months, Years } from '../schemas/grove-curriculum.schema';

export class GetSpontaneousLearningDto {
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
    description: 'Room ID',
    example: '60d0fe4f5311236168a109cb',
  })
  @IsMongoId()
  @IsNotEmpty()
  room: string;
}

