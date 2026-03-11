import { Logger } from '@nestjs/common';
import admin from 'firebase-admin';
import { Model, Types } from 'mongoose';
import { Notification } from '../schemas/notification.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { NotificationSendOptions } from '../config/notification-response';

export function buildFcmData(
  title: string,
  body: string,
  options?: NotificationSendOptions,
): Record<string, string> {
  const data: Record<string, string> = { title, body };
  if (!options) return data;
  if (options.event) data.event = options.event;
  if (options.refModel) data.refModel = options.refModel;
  if (options.relatedEntityId) data.relatedEntityId = options.relatedEntityId;
  if (options.meta) {
    for (const [k, v] of Object.entries(options.meta)) {
      data[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    if (typeof options.meta.url === 'string') {
      data.click_action = options.meta.url;
    }
  }
  if (!data.click_action) data.click_action = '/';
  return data;
}

export async function getEligibleUsersByCampus(
  userModel: Model<User>,
  campusId: string,
  recipientRole?: NotificationSendOptions['recipientRole'],
) {
  const query: any = {
    campuses: campusId,
    fcmToken: { $ne: null },
    notificationsEnabled: true,
  };

  if (recipientRole === 'parent') {
    query.role = UserRole.PARENT;
  }

  return userModel.find(query);
}

export function mapUsersToTokens(users: Array<any>): string[] {
  return users.map(u => u.fcmToken).filter(Boolean) as string[];
}

export function normalizeOptions(options?: NotificationSendOptions): {
  refModel?: 'Announcement' | 'Event' | 'Poll' | 'Survey';
  relatedEntityId?: Types.ObjectId;
  event: 'created' | 'updated' | 'deleted';
  meta: Record<string, any>;
} {
  const refModel = options?.refModel;
  const relatedEntityId = options?.relatedEntityId && Types.ObjectId.isValid(options.relatedEntityId)
    ? new Types.ObjectId(options.relatedEntityId)
    : undefined;
  const event: 'created' | 'updated' | 'deleted' = options?.event || 'created';
  const meta: Record<string, any> = options?.meta || {};
  return { refModel, relatedEntityId, event, meta };
}

export async function sendToTokens(
  firebaseApp: admin.app.App,
  logger: Logger,
  tokens: string[],
  title: string,
  body: string,
  options?: NotificationSendOptions,
): Promise<Array<{ success: boolean }>> {
  const data = buildFcmData(title, body, options);
  const promises = tokens.map(token => {
    const msg = {
      token,
      notification: { title, body },
      data,
    } as admin.messaging.Message;
    return firebaseApp.messaging().send(msg)
      .then(() => ({ success: true }))
      .catch(err => {
        logger.error(`Error sending to ${token}: ${err.message}`);
        return { success: false };
      });
  });
  return Promise.all(promises);
}

export async function persistNotificationsForUsers(
  notificationModel: Model<Notification>,
  users: Array<any>,
  details: {
    campusId?: string;
    relatedEntityId?: Types.ObjectId;
    refModel?: 'Announcement' | 'Event' | 'Poll' | 'Survey';
    title: string;
    body: string;
    meta: Record<string, any>;
    event: 'created' | 'updated' | 'deleted';
  },
  tokenResults: Array<{ success: boolean }> = [],
): Promise<void> {
  await Promise.all(users.map((u, idx) => {
    const delivered = tokenResults[idx]?.success === true;
    const campusIdFromUser = u.campuses?.[0] ? String(u.campuses[0]) : undefined;
    const campusIdToUse = details.campusId || campusIdFromUser;
    if (!campusIdToUse) {
      // Skip persistence if we cannot determine campusId (schema requires it)
      return Promise.resolve();
    }
    return notificationModel.create({
      userId: u._id,
      campusId: new Types.ObjectId(campusIdToUse),
      relatedEntityId: details.relatedEntityId,
      refModel: details.refModel,
      title: details.title,
      body: details.body,
      meta: Object.keys(details.meta || {}).length ? details.meta : undefined,
      deliveryStatus: delivered ? 'sent' : 'failed',
      channel: 'firebase',
      sentAt: delivered ? new Date() : null,
      isRead: false,
      event: details.event,
    } as any);
  }));
}


