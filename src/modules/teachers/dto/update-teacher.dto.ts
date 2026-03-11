import { IsString, IsEmail, IsOptional, IsMongoId, IsBoolean, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeacherDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'First name of the teacher',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Last name of the teacher',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address of the teacher',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description: 'Password for the teacher account',
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
    example: '60d21b4667d0d8992e610c85',
    description: 'ID of the campus this teacher is assigned to',
  })
  @IsMongoId()
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({
    example: '60d21b4667d0d8992e610c86',
    description: 'ID of the room this teacher is assigned to',
  })
  @IsMongoId()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the teacher is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
