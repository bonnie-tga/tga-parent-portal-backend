import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ImmunisationReminderDocument = HydratedDocument<ImmunisationReminder>;

export enum ImmunisationType {
  FOUR_MONTHS = '4 Months',
  SIX_MONTHS = '6 Months',
  TWELVE_MONTHS = '12 Months',
  FOUR_YEARS = '4 Years',
}

export enum ParentResponseStatus {
  ALREADY_DONE = 'Already Done',
  IN_PROGRESS = 'In Progress',
  NO_LONGER_BEING_IMMUNISED = 'No longer being immunised',
}

@Schema({ timestamps: true, collection: 'immunisation_reminders' })
export class ImmunisationReminder {
  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  childId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campusId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  roomId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ImmunisationType),
    required: true,
  })
  remindAbout!: ImmunisationType;

  @Prop({ type: Date, required: true })
  reminderDate!: Date; // Date when reminder was created (1 week before due date)

  @Prop({ type: Date, required: true })
  dueDate!: Date; // Actual immunisation due date

  @Prop({ type: String })
  sentToEmail?: string; // Email address where reminder was sent

  @Prop({
    type: String,
    enum: Object.values(ParentResponseStatus),
    default: ParentResponseStatus.IN_PROGRESS,
  })
  parentResponse!: ParentResponseStatus;

  @Prop({ type: Date })
  respondedAt?: Date; // When parent responded

  @Prop({ type: Types.ObjectId, ref: 'User' })
  respondedBy?: Types.ObjectId; // Parent who responded

  @Prop({ type: Types.ObjectId, ref: 'FeedItem' })
  feedItemId?: Types.ObjectId; // Reference to News Feed post

  @Prop({ type: Boolean, default: false })
  emailSent!: boolean; // Whether email was sent on due date

  @Prop({ type: Date })
  emailSentAt?: Date; // When email was sent

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const ImmunisationReminderSchema =
  SchemaFactory.createForClass(ImmunisationReminder);

// Indexes for efficient queries
ImmunisationReminderSchema.index({ childId: 1, isDeleted: 1 });
ImmunisationReminderSchema.index({ reminderDate: 1, isDeleted: 1 });
ImmunisationReminderSchema.index({ dueDate: 1, emailSent: 1 });
ImmunisationReminderSchema.index({ campusId: 1, isDeleted: 1 });
ImmunisationReminderSchema.index({ roomId: 1, isDeleted: 1 });