import { IsNotEmpty, IsString, IsEnum, IsMongoId, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType, AnnouncementScope, AnnouncementStatus, AnnouncementVisibility } from '../schemas/announcement.schema';


export class CreateAnnouncementDto {
  @ApiProperty({
    example: 'Important Announcement',
    description: 'Title of the announcement',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'This is an important announcement for all parents...',
    description: 'Content of the announcement',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'Brief summary of the announcement',
    description: 'Short description of the announcement',
  })
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @ApiProperty({
    enum: AnnouncementType,
    description: 'Type of announcement',
  })
  @IsEnum(AnnouncementType)
  @IsNotEmpty()
  type: AnnouncementType;

  @ApiProperty({
    enum: AnnouncementScope,
    description: 'Scope of the announcement (campus, room, or all)',
  })
  @IsEnum(AnnouncementScope)
  @IsNotEmpty()
  scope: AnnouncementScope;

  @ApiPropertyOptional({
    enum: AnnouncementStatus,
    description: 'Status of the announcement',
    default: AnnouncementStatus.DRAFT,
  })
  @IsEnum(AnnouncementStatus)
  @IsOptional()
  status?: AnnouncementStatus;

  @ApiPropertyOptional({
    enum: AnnouncementVisibility,
    description: 'Visibility of the announcement',
    default: AnnouncementVisibility.PUBLIC,
  })
  @IsEnum(AnnouncementVisibility)
  @IsOptional()
  visibility?: AnnouncementVisibility;

  @ApiPropertyOptional({
    type: [String],
    example: ['60d0fe4f5311236168a109ca', '60d0fe4f5311236168a109cb'],
    description: 'Array of Campus IDs if the scope is campus',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campuses?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of room IDs if the scope is room',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  rooms?: string[];

  @ApiPropertyOptional({
    example: '2023-06-15',
    description: 'Start date of the announcement/event',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2023-06-20',
    description: 'End date of the announcement/event',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    example: '2023-06-15T10:00:00Z',
    description: 'Publish date of the announcement',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  publishDate?: Date;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of attachment URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of image URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/featured-image.jpg',
    description: 'URL of the featured image',
  })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the announcement is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the announcement is pinned',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether comments are enabled for this announcement',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isCommentEnabled?: boolean;
}