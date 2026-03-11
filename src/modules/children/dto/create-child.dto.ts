import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({
    example: 'Emma',
    description: 'Full name of the child',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({
    example: '2020-01-15',
    description: 'Date of birth of the child',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({
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
    example: 'https://example.com/profile-image.jpg',
    description: 'URL to the profile image of the child',
  })
  @IsString()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the child is toilet trained',
  })
  @IsBoolean()
  @IsOptional()
  toiletTraining?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether consent is not given',
  })
  @IsBoolean()
  @IsOptional()
  noConcent?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Categories associated with the child',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Special requirements for the child',
  })
  @IsString()
  @IsOptional()
  specialRequirements?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether medical information needs updating',
  })
  @IsBoolean()
  @IsOptional()
  updateMedical?: boolean;

  @ApiPropertyOptional({
    type: () => AttendanceEntryDto,
    isArray: true,
    description: 'Attendance schedule entries',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  @IsOptional()
  attendance?: AttendanceEntryDto[];
}

class AttendanceEntryDto {
  @ApiProperty({ description: 'Start time of attendance' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ description: 'End time of attendance' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ type: [String], description: 'Days of attendance' })
  @IsArray()
  @IsString({ each: true })
  days: string[];
}
