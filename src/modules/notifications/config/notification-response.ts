export interface NotificationSendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  message?: string;
}

export function buildNotificationResult(sentCount: number, failedCount: number, message?: string): NotificationSendResult {
  return {
    success: sentCount > 0 && failedCount === 0,
    sentCount,
    failedCount,
    message,
  };
}

export interface NotificationSendOptions {
  event?: 'created' | 'updated' | 'deleted';
  refModel?: 'Announcement' | 'Event' | 'Poll' | 'Survey';
  relatedEntityId?: string;
  meta?: Record<string, any>;
  recipientRole?: 'parent' | 'staff' | 'all';
}

// Global API response helpers
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: any;
}

export function ok<T>(data?: T, message?: string): ApiResponse<T> {
  return { success: true, message, data };
}

export function list<T>(items: T[], message?: string): ApiResponse<T[]> {
  return { success: true, message, data: items, count: items?.length ?? 0 };
}

export function updated<T>(data: T, message = 'Updated successfully'): ApiResponse<T> {
  return { success: true, message, data };
}

export function deleted(count = 0, message = 'Deleted successfully'): ApiResponse<{ deletedCount: number }> {
  return { success: count > 0, message, data: { deletedCount: count } };
}

export function fail(message: string, errors?: any): ApiResponse<null> {
  return { success: false, message, errors };
}

export function fromSendResult(result: NotificationSendResult, message?: string): ApiResponse<NotificationSendResult> {
  return { success: result.success, message: message ?? result.message, data: result };
}
