import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { StoryMediaType, StoryStatus } from '../schemas/story.schema';

export class StoryMediaItemDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty({ enum: StoryMediaType })
  @IsEnum(StoryMediaType)
  type!: StoryMediaType;
}

export enum ApiStoryStatus {
  DRAFT = StoryStatus.DRAFT,
  PUBLISHED = StoryStatus.PUBLISHED,
}

export class CreateStoryDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsMongoId()
  campus!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  rooms!: string[];

  @ApiPropertyOptional({ type: [StoryMediaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryMediaItemDto)
  media?: StoryMediaItemDto[];

  @ApiPropertyOptional({ type: StoryMediaItemDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoryMediaItemDto)
  videoPoster?: StoryMediaItemDto;

  @ApiPropertyOptional({
    enum: ApiStoryStatus,
    default: ApiStoryStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ApiStoryStatus)
  status?: ApiStoryStatus;
}


