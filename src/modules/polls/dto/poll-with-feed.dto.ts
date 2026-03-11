import {
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePollDto } from './create-poll.dto';

export class CreatePollWithFeedDto extends CreatePollDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Automatically create feed item for this poll',
  })
  @IsOptional()
  @IsBoolean()
  createFeedItem?: boolean;

  @ApiPropertyOptional({
    description: 'Custom description for feed item (uses poll title if not provided)',
  })
  @IsOptional()
  feedDescription?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Pin feed item to top',
  })
  @IsOptional()
  @IsBoolean()
  pinFeedItem?: boolean;
}

