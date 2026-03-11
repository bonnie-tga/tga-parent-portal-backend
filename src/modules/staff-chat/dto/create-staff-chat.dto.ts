import { IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffChatStatus } from '../schemas/staff-chat.schema';

export class CreateStaffChatDto {
  @ApiProperty({ description: 'User ID to chat with', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @ApiPropertyOptional({ description: 'Campus ID (optional - will auto-detect common campuses)', example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsMongoId()
  campus?: string;

  @ApiPropertyOptional({ description: 'Chat status (optional - defaults to Open)', enum: StaffChatStatus, default: StaffChatStatus.OPEN })
  @IsOptional()
  @IsEnum(StaffChatStatus)
  status?: StaffChatStatus;
}
