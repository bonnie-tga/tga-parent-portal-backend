import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for sending notification to a specific user
 */
export class SendToUserDto {
  @ApiProperty({ example: 'user_123', description: 'Unique user ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'New Event Available', description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Check out our new event in your campus.', description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: '/event/123', description: 'Optional URL link', required: false })
  @IsString()
  @IsOptional()
  url?: string;
}
