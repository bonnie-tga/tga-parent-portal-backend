import { ApiProperty } from '@nestjs/swagger';
import { Announcement } from '../schemas/announcement.schema';

export class PaginatedAnnouncementsDto {
  @ApiProperty({
    type: [Announcement],
    description: 'Array of announcements',
  })
  data: Announcement[];

  @ApiProperty({
    example: 77,
    description: 'Total number of items',
  })
  totalItems: number;

  @ApiProperty({
    example: 4,
    description: 'Total number of pages',
  })
  totalPages: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  currentPage: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  itemsPerPage: number;

  @ApiProperty({
    example: true,
    description: 'Whether there is a next page',
  })
  hasNextPage: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPreviousPage: boolean;
}

