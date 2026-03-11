import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../../users/schemas/user.schema';
import { buildCampusFilter, buildUserAccessFilter, isAdministrator } from 'src/common/access/access-filter.util';
import admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../config/firebase.constants';
import { Notification } from '../schemas/notification.schema';
import { NotificationSendResult, buildNotificationResult, NotificationSendOptions } from '../config/notification-response';
import {
  getEligibleUsersByCampus,
  mapUsersToTokens,
  normalizeOptions,
  sendToTokens,
  persistNotificationsForUsers,
} from './notifications.helpers';

/**
 * Service for handling push notifications using Firebase Cloud Messaging
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @Inject(FIREBASE_ADMIN) firebaseApp: admin.app.App | null,
  ) {
    this.firebaseApp = firebaseApp;
  }

  private canAccessCampus(currentUser: any, campusId: string): boolean {
    if (!currentUser) return false;
    if (isAdministrator(currentUser)) return true;
    const campuses = (currentUser.campuses || []).map((c: any) => c?.toString());
    return campuses.includes(campusId.toString());
  }

  private async isUserInScope(currentUser: any, targetUserId: string): Promise<boolean> {
    if (!currentUser) return false;
    if (isAdministrator(currentUser)) return true;
    const access = buildUserAccessFilter(currentUser);
    const filter = { _id: new Types.ObjectId(targetUserId), ...access } as any;
    const exists = await this.userModel.exists(filter);
    return !!exists;
  }

  /**
   * Store FCM token for a user
   * @param userId User ID
   * @param fcmToken FCM token
   * @param notificationsEnabled Whether notifications are enabled
   * @returns Updated user
   */
  async storeToken(userId: string, fcmToken: string, notificationsEnabled: boolean): Promise<User> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { 
          fcmToken,
          notificationsEnabled
        },
        { new: true }
      );
      
      if (!updatedUser) {
        this.logger.warn(`User not found when storing FCM token: ${userId}`);
        return null;
      }
      
      this.logger.log(`FCM token stored for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error storing FCM token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove FCM token for a user
   * @param userId User ID
   * @returns Updated user
   */
  async removeToken(userId: string): Promise<User> {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { 
          fcmToken: null,
          notificationsEnabled: false
        },
        { new: true }
      );
      
      if (!updatedUser) {
        this.logger.warn(`User not found when removing FCM token: ${userId}`);
        return null;
      }
      
      this.logger.log(`FCM token removed for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error removing FCM token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to users by campus ID
   * @param campusId Campus ID
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data
   * @returns Result of sending notifications
   */
  async sendByCampus(
  campusId: string,
  title: string,
  body: string,
  options?: NotificationSendOptions,
  currentUser?: User,
): Promise<NotificationSendResult> {
  try {
    if (currentUser && !this.canAccessCampus(currentUser, campusId)) {
      return buildNotificationResult(0, 0, 'Access denied for campus');
    }
    if (!this.firebaseApp) {
      this.logger.warn('Firebase app not initialized');
      return buildNotificationResult(0, 0, 'Firebase app not initialized');
    }

    const users = await getEligibleUsersByCampus(this.userModel, campusId, options?.recipientRole);

    if (!users?.length) {
      this.logger.log(`No users found for campus ${campusId}`);
      return buildNotificationResult(0, 0, 'No users in campus or no valid tokens');
    }

      const tokens = mapUsersToTokens(users);
    if (!tokens.length) {
      this.logger.log('No valid FCM tokens found');
      return buildNotificationResult(0, 0, 'No valid FCM tokens found');
    }

      const results = await sendToTokens(this.firebaseApp!, this.logger, tokens, title, body, options);
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.length - sentCount;

    this.logger.log(`Campus ${campusId}: ${sentCount} sent, ${failedCount} failed`);

      const normalized = normalizeOptions(options);
      await persistNotificationsForUsers(
        this.notificationModel,
        users,
        {
          campusId,
          relatedEntityId: normalized.relatedEntityId,
          refModel: normalized.refModel,
          title,
          body,
          meta: normalized.meta,
          event: normalized.event,
        },
        results,
      );

      return buildNotificationResult(sentCount, failedCount);
  } catch (err) {
    this.logger.error(`Error sending to campus ${campusId}`, err);
    return buildNotificationResult(0, 0, 'Error while sending notifications');
  }
}


  /**
   * Send notification to a specific user
   * @param userId User ID
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data
   * @returns Whether notification was sent successfully
   */
  async sendToUser(
    userId: string, 
    title: string, 
    body: string, 
    options?: NotificationSendOptions,
    currentUser?: User,
  ): Promise<NotificationSendResult> {
    try {
      if (currentUser) {
        const inScope = await this.isUserInScope(currentUser, userId);
        if (!inScope) return buildNotificationResult(0, 0, 'Access denied for target user');
      }
      // Check if Firebase app is initialized
      if (!this.firebaseApp) {
        this.logger.warn('Firebase app not initialized, cannot send notifications');
        return buildNotificationResult(0, 0, 'Firebase app not initialized');
      }
      
      const user = await this.userModel.findById(userId);
      
      if (!user || !user.fcmToken || !user.notificationsEnabled) {
        this.logger.log(`User ${userId} not found or notifications disabled`);
        return buildNotificationResult(0, 0, 'User not found or notifications disabled');
      }
      
      // Create the message with proper structure for Firebase Admin SDK
      const tokenResults = await sendToTokens(this.firebaseApp!, this.logger, [user.fcmToken], title, body, options);
      const delivered = tokenResults[0]?.success === true;
      const normalized = normalizeOptions(options);
      await persistNotificationsForUsers(
        this.notificationModel,
        [user],
        {
          campusId: user.campuses?.[0] ? String(user.campuses[0]) : undefined,
          relatedEntityId: normalized.relatedEntityId,
          refModel: normalized.refModel,
          title,
          body,
          meta: normalized.meta,
          event: normalized.event,
        },
        tokenResults,
      );
      
      this.logger.log(`Notification sent to user ${userId}`);
      return buildNotificationResult(delivered ? 1 : 0, delivered ? 0 : 1);
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
      return buildNotificationResult(0, 1, 'Error sending notification to user');
    }
  }

  /**
   * Get notifications by user ID
   */
  async getByUser(userId: string, currentUser?: User): Promise<Notification[]> {
    try {
      if (currentUser) {
        const self = currentUser._id?.toString?.() === userId;
        if (!self) {
          const inScope = await this.isUserInScope(currentUser, userId);
          if (!inScope) return [];
        }
      }
      const userObjectId = new Types.ObjectId(userId);
      return await this.notificationModel
        .find({ userId: userObjectId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get notifications by campus ID
   */
  async getByCampus(campusId: string, currentUser?: User): Promise<Notification[]> {
    try {
      if (currentUser && !this.canAccessCampus(currentUser, campusId)) return [];
      const campusObjectId = new Types.ObjectId(campusId);
      return await this.notificationModel
        .find({ campusId: campusObjectId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error(`Error fetching notifications for campus ${campusId}:`, error);
      throw error;
    }
  }

  /**
   * Get notifications by campus ID and user ID
   */
  async getByCampusAndUser(campusId: string, userId: string, currentUser?: User): Promise<Notification[]> {
    try {
      if (currentUser) {
        const campusAllowed = this.canAccessCampus(currentUser, campusId);
        const userAllowed = await this.isUserInScope(currentUser, userId);
        if (!campusAllowed || !userAllowed) return [];
      }
      const campusObjectId = new Types.ObjectId(campusId);
      const userObjectId = new Types.ObjectId(userId);
      return await this.notificationModel
        .find({ campusId: campusObjectId, userId: userObjectId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error(
        `Error fetching notifications for campus ${campusId} and user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Set read/unread status for a notification
   */
  async setReadStatus(notificationId: string, isRead: boolean, currentUser?: User): Promise<Notification | null> {
    try {
      const notificationObjectId = new Types.ObjectId(notificationId);
      const existing = await this.notificationModel.findById(notificationObjectId).lean();
      if (!existing) return null;
      if (currentUser) {
        const campusOk = existing.campusId ? this.canAccessCampus(currentUser, String(existing.campusId)) : false;
        const userOk = existing.userId ? await this.isUserInScope(currentUser, String(existing.userId)) : false;
        const selfOk = String(existing.userId || '') === (currentUser._id?.toString?.() || '');
        if (!(campusOk || userOk || selfOk)) return null;
      }
      const updated = await this.notificationModel.findByIdAndUpdate(
        { _id: notificationObjectId },
        {
          isRead,
          readAt: isRead ? new Date() : null,
        },
        { new: true },
      );
      if (!updated) {
        this.logger.warn(`Notification not found for read status update: ${notificationId}`);
      }
      return updated;
    } catch (error) {
      this.logger.error(`Error updating read status for notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Soft-delete all notifications for a user
   */
  async deleteByUser(userId: string, currentUser?: User): Promise<number> {
    try {
      if (currentUser) {
        const self = currentUser._id?.toString?.() === userId;
        if (!self) {
          const inScope = await this.isUserInScope(currentUser, userId);
          if (!inScope) return 0;
        }
      }
      const userIdObjectId = new Types.ObjectId(userId);
      const result = await this.notificationModel.updateMany(
        { userId: userIdObjectId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      );
      const modified = (result as any).modifiedCount ?? 0;
      this.logger.log(`Soft-deleted ${modified} notifications for user ${userId}`);
      return modified;
    } catch (error) {
      this.logger.error(`Error deleting notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Soft-delete a single notification by ID
   */
  async deleteOne(notificationId: string, currentUser?: User): Promise<boolean> {
    try {
      const notificationObjectId = new Types.ObjectId(notificationId);
      if (currentUser) {
        const existing = await this.notificationModel.findById(notificationObjectId).lean();
        if (existing) {
          const campusOk = existing.campusId ? this.canAccessCampus(currentUser, String(existing.campusId)) : false;
          const userOk = existing.userId ? await this.isUserInScope(currentUser, String(existing.userId)) : false;
          const selfOk = String(existing.userId || '') === (currentUser._id?.toString?.() || '');
          if (!(campusOk || userOk || selfOk)) return false;
        } else {
          return false;
        }
      }
      const updated = await this.notificationModel.findByIdAndUpdate(
        { _id: notificationObjectId },
        { $set: { isDeleted: true } },
        { new: true },
      );
      const success = !!updated;
      if (!success) {
        this.logger.warn(`Notification not found for delete: ${notificationId}`);
      }
      return success;
    } catch (error) {
      this.logger.error(`Error deleting notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Mark all notifications for a user as read/unread
   */
  async setReadStatusForUser(userId: string, isRead: boolean, currentUser?: User): Promise<number> {
    try {
      if (currentUser) {
        const self = currentUser._id?.toString?.() === userId;
        if (!self) {
          const inScope = await this.isUserInScope(currentUser, userId);
          if (!inScope) return 0;
        }
      }
      const userObjectId = new Types.ObjectId(userId);
      const result = await this.notificationModel.updateMany(
        { userId: userObjectId, isDeleted: { $ne: true }, isRead: { $ne: isRead } },
        { $set: { isRead, readAt: isRead ? new Date() : null } },
      );
      const modified = (result as any).modifiedCount ?? 0;
      this.logger.log(
        `Marked ${modified} notifications as ${isRead ? 'read' : 'unread'} for user ${userId}`,
      );
      return modified;
    } catch (error) {
      this.logger.error(`Error updating read status for user ${userId}:`, error);
      throw error;
    }
  }
}
