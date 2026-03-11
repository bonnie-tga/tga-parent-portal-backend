import { IsNotEmpty, IsString, IsEmail, IsOptional, IsMongoId, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the teacher',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the teacher',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the teacher',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password for the teacher account',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password: string;

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
}
