import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ToiletTrainingCategory } from '../schemas/toilet-training.schema';

export class CreateToiletTrainingTimeSlotDto {
  @ApiProperty({ type: [String], enum: ToiletTrainingCategory })
  @IsArray()
  @IsEnum(ToiletTrainingCategory, { each: true })
  @IsOptional()
  categories?: ToiletTrainingCategory[];

  @ApiProperty({ description: 'Staff id' })
  @IsOptional()
  @IsMongoId()
  staff?: string;

  @ApiProperty({ description: 'done time' })
  @IsOptional()
  @IsString()
  doneTime?: string;
}

export class CreateToiletTrainingChildEntryDto {
  @ApiPropertyOptional({ description: 'Child id if known' })
  @IsMongoId()
  @IsOptional()
  child?: string;

  @ApiProperty({ type: [CreateToiletTrainingTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateToiletTrainingTimeSlotDto)
  @IsOptional()
  slots?: CreateToiletTrainingTimeSlotDto[];

  @ApiPropertyOptional({ description: 'comments for the child' })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class CreateToiletTrainingDto {
  @ApiProperty({ example: '2025-10-09' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Campus id' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiPropertyOptional({ description: 'Room id' })
  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @ApiProperty({ type: [CreateToiletTrainingChildEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateToiletTrainingChildEntryDto)
  @IsOptional()
  toiletTrainingChildEntries?: CreateToiletTrainingChildEntryDto[];
}


