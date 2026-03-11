import { Controller, Post, Body, UseGuards, Delete, HttpCode, HttpStatus, Get, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationTokenDto } from '../dto/notification-token.dto';
import { SendToUserDto } from '../dto/send-to-user.dto';
import { SendToCampusDto } from '../dto/send-to-campus.dto';
import { MarkAllAsReadDto, MarkAsReadDto } from '../dto/mark-as-read.dto';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { User } from 'src/modules/users/schemas/user.schema';
import { ApiSecurityAuth } from 'src/modules/auth/decorators/api-bearer-auth.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { list, ok, updated, deleted as deletedResp, fromSendResult, fail } from '../config/notification-response';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

/**
 * Controller for handling notification-related endpoints
 */
@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post('test/user')
  @ApiOperation({ summary: 'Send notification to a specific user' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - missing required fields' })
  async testSendToUser(@CurrentUser() currentUser: User, @Body() dto: SendToUserDto) {
    // Validate required fields
    if (!dto || !dto.userId || !dto.title || (!('body' in dto) && !('message' in dto))) {
      return {
        success: false,
        message: 'Missing required fields: userId, title, and body/message are required'
      };
    }

    const body = (dto as any).body ?? (dto as any).message;
    const result = await this.notificationsService.sendToUser(
      dto.userId,
      dto.title,
      body,
      {
        event: (dto as any).event,
        refModel: (dto as any).refModel,
        relatedEntityId: (dto as any).relatedEntityId,
        meta: (dto as any).meta,
      },
      currentUser,
    );
    return fromSendResult(result);
  }

  @Post('test/campus')
  @ApiOperation({ summary: 'Send notification to users by campus ID' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - missing required fields' })
  async testSendToCampus(@CurrentUser() currentUser: User, @Body() dto: SendToCampusDto) {
    // Validate required fields
    if (!dto || !dto.campusId || !dto.title || !dto.body) {
      return {
        success: false,
        message: 'Missing required fields: campusId, title, and body are required'
      };
    }

    const result = await this.notificationsService.sendByCampus(
      dto.campusId,
      dto.title,
      dto.body,
      {
        event: dto.event,
        refModel: dto.refModel,
        relatedEntityId: dto.relatedEntityId,
        meta: dto.meta,
      },
      currentUser,
    );
    return fromSendResult(result);
  }


  /**
   * Store FCM token for the authenticated user
   * @param currentUser Current authenticated user from decorator
   * @param tokenDto FCM token data
   * @returns Success message
   */
  @Post('save-token')
  @ApiOperation({ summary: 'Store FCM token for notifications' })
  @ApiBody({ type: NotificationTokenDto })
  @ApiResponse({ status: 200, description: 'Token stored successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async storeToken(@CurrentUser() currentUser: User, @Body() tokenDto: NotificationTokenDto) {
    try {
      const userId = currentUser._id.toString();

      if (!userId) return fail('User ID not found in token');

      const user = await this.notificationsService.storeToken(
        userId,
        tokenDto.fcmToken,
        tokenDto.notificationsEnabled
      );

      if (!user) return fail('User not found');

      return ok({ notificationsEnabled: tokenDto.notificationsEnabled }, 'Notification token stored successfully');
    } catch (error) {
      console.error('Error storing notification token:', error);
      return fail('Failed to store notification token');
    }
  }

  /**
   * Remove FCM token for the authenticated user
   * @param currentUser Current authenticated user from decorator
   * @returns Success message
   */
  @Delete('token')
  @ApiOperation({ summary: 'Remove FCM token for notifications' })
  @ApiResponse({ status: 200, description: 'Token removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.OK)
  async removeToken(@CurrentUser() currentUser: User) {
    try {
      const userId = currentUser._id.toString();

      if (!userId) return fail('User ID not found in token');

      // Remove the token and get the user document
      const user = await this.notificationsService.removeToken(userId);

      if (!user) return fail('User not found');

      return ok({ notificationsEnabled: false }, 'Notification token removed successfully');
    } catch (error) {
      console.error('Error removing notification token:', error);
      return fail('Failed to remove notification token');
    }
  }
  /**
   * Get notifications by user ID
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications by user ID' })
  @ApiResponse({ status: 200, description: 'Notifications fetched' })
  async getByUser(@CurrentUser() currentUser: User, @Param('userId') userId: string) {
    const notifications = await this.notificationsService.getByUser(userId, currentUser);
    return list(notifications);
  }

  /**
   * Get notifications by campus ID
   */
  @Get('campus/:campusId')
  @ApiOperation({ summary: 'Get notifications by campus ID' })
  @ApiResponse({ status: 200, description: 'Notifications fetched' })
  async getByCampus(@CurrentUser() currentUser: User, @Param('campusId') campusId: string) {
    const notifications = await this.notificationsService.getByCampus(campusId, currentUser);
    return list(notifications);
  }

  /**
   * Get notifications by campus ID and user ID
   */
  @Get('campus/:campusId/user/:userId')
  @ApiOperation({ summary: 'Get notifications by campus and user IDs' })
  @ApiResponse({ status: 200, description: 'Notifications fetched' })
  async getByCampusAndUser(@CurrentUser() currentUser: User, @Param('campusId') campusId: string, @Param('userId') userId: string) {
    const notifications = await this.notificationsService.getByCampusAndUser(campusId, userId, currentUser);
    return list(notifications);
  }

  /**
   * Mark notification as read/unread
   */
  @Patch('mark-read')
  @ApiOperation({ summary: 'Mark a notification as read/unread' })
  @ApiBody({
    type: MarkAsReadDto,
    examples: {
      markRead: {
        summary: 'Mark as read',
        value: { notificationId: '68f97c78e5d6b90d0d7df2c4', isRead: true },
      },
      markUnread: {
        summary: 'Mark as unread',
        value: { notificationId: '68f97c78e5d6b90d0d7df2c4', isRead: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Notification updated' })
  async setReadStatus(@CurrentUser() currentUser: User, @Body() dto: MarkAsReadDto) {
    const updatedDoc = await this.notificationsService.setReadStatus(dto.notificationId, dto.isRead, currentUser);
    if (!updatedDoc) return fail('Notification not found');
    return updated(updatedDoc);
  }

  /**
   * Delete notifications by user ID (soft delete)
   */
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Delete notifications by user ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Notifications deleted' })
  async deleteByUser(@CurrentUser() currentUser: User, @Param('userId') userId: string) {
    const deletedCount = await this.notificationsService.deleteByUser(userId, currentUser);
    return deletedResp(deletedCount);
  }

  /**
   * Mark all notifications as read/unread for a user
   */
  @Patch('user/:userId/mark-all')
  @ApiOperation({ summary: 'Mark all notifications as read/unread for a user' })
  @ApiBody({
    type: MarkAllAsReadDto,
    examples: {
      markAllRead: { summary: 'Mark all notifications as read', value: { isRead: true } },
      markAllUnread: { summary: 'Mark all notifications as unread', value: { isRead: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Notifications updated' })
  async markAllByUser(
    @CurrentUser() currentUser: User,
    @Param('userId') userId: string,
    @Body('isRead') isRead: boolean,
  ) {
    const updatedCount = await this.notificationsService.setReadStatusForUser(userId, isRead, currentUser);
    return updated({ updatedCount }, `Marked ${isRead ? 'read' : 'unread'}`);
  }
  /**
   * Delete single notification by ID (soft delete)
   */
  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete single notification by ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteOne(@CurrentUser() currentUser: User, @Param('notificationId') notificationId: string) {
    const success = await this.notificationsService.deleteOne(notificationId, currentUser);
    return success ? deletedResp(1) : deletedResp(0);
  }
}
