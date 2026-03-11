import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWellbeingDto {
  @ApiProperty({
    description: 'Child ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  childId!: string;

  @ApiProperty({
    enum: ['sleep-timer', 'daily-chart', 'nappy-change', 'toilet-training'],
    example: 'nappy-change',
    description: 'Type of wellbeing activity',
  })
  @IsEnum(['sleep-timer', 'daily-chart', 'nappy-change', 'toilet-training'])
  type!: 'sleep-timer' | 'daily-chart' | 'nappy-change' | 'toilet-training';

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Reference ID to the source document',
  })
  @IsMongoId()
  refId!: string;


  @ApiPropertyOptional({
    description: 'Summary data for UI display',
    example: { categories: ['wet', 'soiled'], doneTime: '8:45 AM' },
  })
  @IsOptional()
  @IsObject()
  payload?: any;

  @ApiPropertyOptional({
    example: 'Additional notes about the activity',
    description: 'Optional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
