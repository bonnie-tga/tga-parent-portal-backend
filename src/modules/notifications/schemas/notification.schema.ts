// src/modules/notifications/schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  /** The user receiving the notification */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** The campus this notification belongs to (for multi-campus setup) */
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campusId: Types.ObjectId;

  /** Optional reference to the related module entity (e.g., Survey, Poll, Announcement) */
  @Prop({ 
    type: Types.ObjectId,
    refPath: 'refModel' // Dynamic reference based on refModel field
  })
  relatedEntityId?: Types.ObjectId;

  /** Virtual field to determine which model to populate */
  @Prop({ 
    type: String,
    enum: ['Announcement', 'Event', 'Poll', 'Survey'],
    required: false
  })
  refModel?: string;


  /** Event type — e.g., created, updated, published, closed */
  @Prop({ required: true, enum: ['created', 'updated', 'deleted'], default: 'created' })
  event: 'created' | 'updated' | 'deleted';

  /** Notification title */
  @Prop({ required: true })
  title: string;

  /** Notification body text */
  @Prop()
  body?: string;

  /** Additional metadata — e.g., redirect URL, surveyId, etc. */
  @Prop({ type: Object })
  meta?: Record<string, any>;

  /** Delivery status — whether notification was sent to Firebase successfully */
  @Prop({ default: 'sent', enum: ['sent', 'failed'] })
  deliveryStatus: 'sent' | 'failed';

  /** Whether the user has read it */
  @Prop({ default: false })
  isRead: boolean;

  /** Timestamp when read */
  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  /** Timestamp when notification was successfully sent */
  @Prop({ type: Date, default: null })
  sentAt?: Date | null;

  /** Channel used for notification (firebase, email, sms, etc.) */
  @Prop({ default: 'firebase' })
  channel: string;

  /** Soft delete flag */
  @Prop({ default: false })
  isDeleted?: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
