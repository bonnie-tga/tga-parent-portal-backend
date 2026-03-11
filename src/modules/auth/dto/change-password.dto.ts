import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldP@ss123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 chars, must include uppercase, lowercase, number)',
    example: 'NewP@ss123',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d\\W]{8,}$',
  })
  @IsString()
  newPassword: string;
}
