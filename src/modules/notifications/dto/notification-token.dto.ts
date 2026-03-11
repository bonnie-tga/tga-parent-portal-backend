import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

/**
 * DTO for notification token operations
 */
export class NotificationTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @IsBoolean()
  notificationsEnabled: boolean;
}
