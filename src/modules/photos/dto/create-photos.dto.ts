import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PhotoStatus, PhotoVisibility } from '../schemas/photos.schema';

export class CreatePhotosDto {
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  children: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  excludeChildren?: string[];

  @IsNumber()
  @IsNotEmpty()
  year: number;

  @IsDateString()
  @IsOptional()
  downloadSchedule?: string;

  @IsString()
  @IsNotEmpty()
  sendTo: string;

  @IsEnum(PhotoStatus)
  @IsOptional()
  status?: PhotoStatus;

  @IsEnum(PhotoVisibility)
  @IsOptional()
  visibility?: PhotoVisibility;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @IsMongoId()
  @IsOptional()
  createdBy?: string;

  @IsMongoId()
  @IsOptional()
  updatedBy?: string;

  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}
