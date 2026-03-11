import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventStatus } from '../schema/event.schema';

export class CreateEventDto {
  @ApiProperty({ description: 'Title of the event' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Start date of the event (ISO string)' })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      const v = value.trim();
      return v === '' ? undefined : v;
    }
    return value;
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of the event (ISO string)' })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      const v = value.trim();
      return v === '' ? undefined : v;
    }
    return value;
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Start time (e.g., 09:00)' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (e.g., 17:00)' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ type: [String], description: 'Campus IDs' })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  campus: string[];

  @ApiPropertyOptional({ type: [String], description: 'Room IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  room?: string[];

  @ApiProperty({ description: 'Location name/address' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ description: 'Short summary of the event' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Detailed content/description' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Description for the attached PDF' })
  @IsString()
  @IsOptional()
  pdfDescription?: string;

  @ApiPropertyOptional({ description: 'PDF URL' })
  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiProperty({ description: 'Whether RSVP is required' })
  @IsBoolean()
  rsvpRequired: boolean;

  @ApiPropertyOptional({ description: 'Send post-event survey' })
  @IsBoolean()
  @IsOptional()
  sendSurveyAfterEvent?: boolean;

  @ApiProperty({ enum: EventStatus, description: 'Publishing status' })
  @IsEnum(EventStatus)
  status: EventStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether comments are enabled for this event',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isCommentEnabled?: boolean;
}


