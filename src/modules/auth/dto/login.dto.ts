import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user (email or username required)',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'username123',
    description: 'Username of the user (email or username required)',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}