import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffChatStatus } from '../schemas/staff-chat.schema';

export class UpdateStaffChatDto {
  @ApiPropertyOptional({ description: 'Chat status', enum: StaffChatStatus })
  @IsOptional()
  @IsEnum(StaffChatStatus)
  status?: StaffChatStatus;
}
