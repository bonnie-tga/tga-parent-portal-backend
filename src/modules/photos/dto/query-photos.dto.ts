import {
  IsMongoId,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoStatus } from '../schemas/photos.schema';

export enum PhotoSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryPhotosDto {
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
    example: '60d0fe4f5311236168a109cc',
    description: 'Filter by child ID',
  })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiPropertyOptional({
    enum: PhotoStatus,
    description: 'Filter by photo status',
  })
  @IsEnum(PhotoStatus)
  @IsOptional()
  status?: PhotoStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Maximum items per page',
    default: 15,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    example: 'search text',
    description: 'Free text search query',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'lastModified',
    description: 'Field name to sort by',
    default: 'lastModified',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: PhotoSortOrder,
    description: 'Sort direction',
    default: PhotoSortOrder.DESC,
  })
  @IsEnum(PhotoSortOrder)
  @IsOptional()
  sortOrder?: PhotoSortOrder;
}
