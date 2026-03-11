import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSleepTimerDto } from './create-sleep-timer.dto';

export class UpdateSleepTimerDto extends PartialType(CreateSleepTimerDto) {
  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Date of the sleep timer',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T14:30:00.000Z',
    description: 'Start sleep time',
  })
  @IsDateString()
  @IsOptional()
  startSleepTime?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T16:00:00.000Z',
    description: 'End sleep time',
  })
  @IsDateString()
  @IsOptional()
  endSleepTime?: string;
}
