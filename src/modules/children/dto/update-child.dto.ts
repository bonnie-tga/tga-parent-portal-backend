import {
  IsString,
  IsMongoId,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChildDto {
  @ApiPropertyOptional({
    example: 'Emma',
    description: 'Full name of the child',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    example: '2020-01-15',
    description: 'Date of birth of the child',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109ca',
    description: 'Campus ID that this child belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiPropertyOptional({
    example: '60d0fe4f5311236168a109cb',
    description: 'Room ID that this child belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of parent user IDs',
  })
  @IsArray()
  @IsMongoId({ each: true })
  parents: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the child is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the child is archived',
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({
    example: 'https://example.com/profile-image.jpg',
    description: 'URL to the profile image of the child',
  })
  @IsString()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Categories associated with the child',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Special requirements for the child',
  })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether medical information needs updating',
  })
  @IsOptional()
  @IsBoolean()
  updateMedical?: boolean;

  @ApiPropertyOptional({
    type: () => AttendanceEntryDto,
    isArray: true,
    description: 'Attendance schedule entries',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  attendance?: AttendanceEntryDto[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the child is toilet trained',
  })
  @IsOptional()
  @IsBoolean()
  toiletTraining?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether consent is not given',
  })
  @IsOptional()
  @IsBoolean()
  noConcent?: boolean;
}

class AttendanceEntryDto {
  @ApiPropertyOptional({ description: 'ID of the attendance entry (optional for updates)' })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiPropertyOptional({ description: 'Start time of attendance' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End time of attendance' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ type: [String], description: 'Days of attendance' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[];
}
