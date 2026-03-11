import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedItemDto {
  @ApiProperty({
    enum: ['announcement', 'event', 'poll', 'survey', 'daily-journal', 'immunisation-reminder', 'new-staff'],
    example: 'announcement',
  })
  @IsEnum(['announcement', 'event', 'poll', 'survey', 'daily-journal', 'immunisation-reminder', 'new-staff'])
  type!: 'announcement' | 'event' | 'poll' | 'survey' | 'daily-journal' | 'immunisation-reminder' | 'new-staff';

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Reference ID to the source document',
  })
  @IsMongoId()
  refId!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isForAllCampuses!: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  campuses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  rooms?: string[];

  @ApiProperty({ example: 'Important Announcement' })
  @IsString()
  @Length(1, 500)
  title!: string;

  @ApiPropertyOptional({ example: 'Detailed description here' })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  visibleFrom?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  visibleUntil?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

