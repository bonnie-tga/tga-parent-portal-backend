import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  MinLength,
  IsOptional,
  IsArray,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Role of the user',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of campus IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  campuses?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of room IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  rooms?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the user is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of media URLs (images/videos)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];
}
