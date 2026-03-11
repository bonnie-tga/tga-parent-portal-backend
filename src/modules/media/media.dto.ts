import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from './media.entity';
import { IsArray, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMediaDto {
  @ApiProperty({ enum: MediaType, description: 'Type of media' })
  @IsNotEmpty()
  type: MediaType;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campuses?: string[];
}
