import {
  IsMongoId,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CotRoomCheckStatus } from '../schemas/cot-room-check.schema';

export enum CotRoomCheckSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryCotRoomCheckDto {
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
    description: 'Filter by staff ID',
  })
  @IsMongoId()
  @IsOptional()
  staff?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cc',
    description: 'Filter by cot room ID',
  })
  @IsMongoId()
  @IsOptional()
  cotRoom?: string;

  @ApiPropertyOptional({
    enum: CotRoomCheckStatus,
    description: 'Filter by cot room check status',
  })
  @IsEnum(CotRoomCheckStatus)
  @IsOptional()
  status?: CotRoomCheckStatus;

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
    example: 'search text by child name, room name, cot room name, status, date',
    description: 'Free text search query',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Field name to sort by',
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: CotRoomCheckSortOrder,
    description: 'Sort direction',
    default: CotRoomCheckSortOrder.DESC,
  })
  @IsEnum(CotRoomCheckSortOrder)
  @IsOptional()
  sortOrder?: CotRoomCheckSortOrder;
}
