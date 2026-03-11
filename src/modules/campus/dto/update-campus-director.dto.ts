import { IsString, IsOptional, IsEmail, IsBoolean, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCampusDirectorDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'First name of the campus director',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name of the campus director',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address of the campus director',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description: 'Password for the campus director account',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the campus director is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}