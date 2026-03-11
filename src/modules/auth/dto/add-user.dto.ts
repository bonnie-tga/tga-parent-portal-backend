import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, IsOptional, IsArray, IsMongoId, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, AccessScope } from '../../users/schemas/user.schema';

export class AddUserDto {
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

  @ApiPropertyOptional({
    example: 'user',
    description: 'Username of the user (email or username required)',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user (email or username required)',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'password123',
    description: 'Password for the user account (optional - will be auto-generated if not provided)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Role of the user',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    enum: AccessScope,
    description: 'Access scope of the user',
    default: AccessScope.SINGLE_CAMPUS
  })
  @IsEnum(AccessScope)
  @IsOptional()
  accessScope: AccessScope;

  @ApiProperty({
    example: true,
    description: 'Is the user active?',
  })
  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of campus IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  campuses: string[] = [];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of room IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  rooms: string[] = [];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of child IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  children: string[] = [];
}