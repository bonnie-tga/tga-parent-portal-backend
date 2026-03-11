import { IsEnum, IsMongoId, IsOptional, IsBoolean, IsDateString, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType, AnnouncementScope, AnnouncementStatus } from '../schemas/announcement.schema';

export class QueryAnnouncementsDto {
  @ApiPropertyOptional({
    enum: AnnouncementType,
    description: 'Filter by announcement type',
  })
  @IsEnum(AnnouncementType)
  @IsOptional()
  type?: AnnouncementType;

  @ApiPropertyOptional({
    enum: AnnouncementScope,
    description: 'Filter by announcement scope',
  })
  @IsEnum(AnnouncementScope)
  @IsOptional()
  scope?: AnnouncementScope;

  @ApiPropertyOptional({
    enum: AnnouncementStatus,
    description: 'Filter by announcement status',
  })
  @IsEnum(AnnouncementStatus)
  @IsOptional()
  status?: AnnouncementStatus;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109ca',
    description: 'Filter by campus ID',
  })
  @IsMongoId()
  @IsOptional()
  campus?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cb',
    description: 'Filter by room ID',
  })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '2023-06-15',
    description: 'Filter by start date (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2023-06-20',
    description: 'Filter by end date (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'parent meeting',
    description: 'Search query for title, content, and short description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'title',
    description: 'Field to sort by',
    enum: ['title', 'createdAt', 'updatedAt', 'publishDate'],
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of room IDs for filtering',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  rooms?: string[];
}
