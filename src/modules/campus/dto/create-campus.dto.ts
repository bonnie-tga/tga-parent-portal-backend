import { IsNotEmpty, IsString, IsOptional, IsEmail, IsPhoneNumber, IsBoolean, IsDate, IsMongoId, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CampusStatus } from '../schemas/campus.schema';

export class CreateCampusDto {
  @ApiProperty({
    example: 'TGA North Campus',
    description: 'Name of the campus',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '123 Main Street, Sydney NSW 2000',
    description: 'Address of the campus',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: '+61 2 1234 5678',
    description: 'Phone number of the campus',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'north@tgacampus.com',
    description: 'Email address of the campus',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'ID of the campus director',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsMongoId()
  @IsOptional()
  campusDirector?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the campus is open',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;

  @ApiPropertyOptional({
    type: Date,
    description: 'VIP orientation date',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  vipOrientationDate?: Date;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the campus is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: CampusStatus,
    description: 'Status of the campus',
    default: CampusStatus.DRAFT,
  })
  @IsEnum(CampusStatus)
  @IsOptional()
  status?: CampusStatus;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/reviews/...',
    description: 'Google Review URL for the campus',
  })
  @IsString()
  @IsOptional()
  googleReview?: string;
}
