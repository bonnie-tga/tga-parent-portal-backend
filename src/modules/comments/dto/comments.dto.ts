import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentStatus, StaffReplyAs } from '../schemas/comment.schema';

export class CreateCommentDto {
  @ApiProperty({ description: 'Announcement or Event ID to comment on' })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiProperty({ description: 'Comment content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ 
    description: 'Type of entity being commented on',
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'],
    default: 'announcement'
  })
  @IsOptional()
  @IsEnum(['announcement', 'event', 'dailyJournal', 'yearReport'])
  entityType?: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';
}

export class ReplyCommentDto {
  @ApiProperty({ description: 'Comment ID to reply to' })
  @IsString()
  @IsNotEmpty()
  commentId: string;

  @ApiProperty({ description: 'Reply content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ 
    description: 'How staff reply should appear',
    enum: StaffReplyAs,
    default: StaffReplyAs.GROVE_ACADEMY
  })
  @IsOptional()
  @IsEnum(StaffReplyAs)
  staffReplyAs?: StaffReplyAs;
}

export class UpdateCommentStatusDto {
  @ApiProperty({ 
    description: 'New comment status',
    enum: CommentStatus
  })
  @IsEnum(CommentStatus)
  status: CommentStatus;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}

export class QueryCommentsDto {
  @ApiPropertyOptional({ description: 'Filter by announcement ID' })
  @IsOptional()
  @IsString()
  announcementId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by comment status',
    enum: CommentStatus
  })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiPropertyOptional({ description: 'Filter by parent ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Filter by campus ID' })
  @IsOptional()
  @IsString()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Include deleted comments', default: false })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by entity type',
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport']
  })
  @IsOptional()
  @IsEnum(['announcement', 'event', 'dailyJournal', 'yearReport'])
  entityType?: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Filter to threads with new/unread comments for current staff' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyNew?: boolean;
}

export class LikeAnnouncementDto {
  @ApiProperty({ description: 'Announcement or Event ID to like/unlike' })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiPropertyOptional({ 
    description: 'Type of entity being liked',
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'],
    default: 'announcement'
  })
  @IsOptional()
  @IsEnum(['announcement', 'event', 'dailyJournal', 'yearReport'])
  entityType?: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';
}

export class MarkSeenDto {
  @ApiProperty({ description: 'Entity (thread) ID (announcementId)' })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiPropertyOptional({ description: 'Parent ID for per-parent thread tracking' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({
    description: 'Entity type',
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'],
  })
  @IsEnum(['announcement', 'event', 'dailyJournal', 'yearReport'])
  entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';
}
