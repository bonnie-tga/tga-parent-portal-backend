import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class AddChildCotCheckTimeDto {
  @ApiProperty({
    description: 'Cot check time to add (ISO date string)',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  time: string;
}

