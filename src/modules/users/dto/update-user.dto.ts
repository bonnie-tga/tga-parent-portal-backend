import { IsEmail, IsString, IsEnum, MinLength, IsOptional, IsArray, IsMongoId, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, AccessScope } from '../schemas/user.schema';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'First name of the user',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name of the user',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'username123',
    description: 'Username of the user',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'password123',
    description: 'Password for the user account',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Role of the user',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    enum: AccessScope,
    description: 'Determines the data visibility level for a user, set automatically when updating a role',
    example: AccessScope.SINGLE_CAMPUS,
  })
  @IsEnum(AccessScope)
  @IsOptional()
  accessScope?: AccessScope;

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
    type: [String],
    description: 'Array of room IDs the user has access to',
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  children?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the user is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the user is archived',
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
