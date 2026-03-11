// src/modules/notifications/dto/mark-as-read.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({ description: 'Notification ID to mark as read', example: '68f97c78e5d6b90d0d7df2c4' })
  @IsMongoId()
  notificationId: string;

  @ApiProperty({ description: 'Read status to set', default: true, example: true })
  @IsBoolean()
  isRead: boolean;
}

export class MarkAllAsReadDto {
  @ApiProperty({ description: 'Read status to set', default: true, example: true })
  @IsBoolean()
  isRead: boolean = true;
}
