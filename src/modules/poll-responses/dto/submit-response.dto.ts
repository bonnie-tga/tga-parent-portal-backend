import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitPollResponseDto {
  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011',
    description: 'Poll ID to submit response for'
  })
  @IsMongoId()
  pollId!: string;

  @ApiProperty({
    example: 0,
    description: 'Question index in the poll (0-based)',
  })
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @ApiProperty({
    type: [String],
    example: ['apple', 'banana'],
    description: 'Selected choice labels (not IDs). Can be empty array to unselect all choices.',
  })
  @IsArray()
  @IsString({ each: true })
  selectedChoiceLabels!: string[];

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439014',
    description: 'Campus ID (auto-derived from user if not provided)',
  })
  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439015',
    description: 'Child ID for parent voting on behalf of child',
  })
  @IsOptional()
  @IsMongoId()
  childId?: string;

  @ApiPropertyOptional({ example: 'Great option!', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate submissions',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  requestIdempotencyKey?: string;
}

