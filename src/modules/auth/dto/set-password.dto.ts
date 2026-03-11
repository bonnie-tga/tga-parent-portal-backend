import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEmail, IsOptional } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description: 'Password set token received via email',
    example: 'abc123def456ghi789',
    type: String,
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Set password token is required' })
  token: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  email: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'NewSecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}
