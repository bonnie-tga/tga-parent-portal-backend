import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetExperienceFromDailyJournalDto {
  @ApiProperty({
    description: 'Selected date to load weekly data (will load Mon-Fri of that week)',
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
}

