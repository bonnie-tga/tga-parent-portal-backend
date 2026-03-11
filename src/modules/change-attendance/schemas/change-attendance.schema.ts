import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ChangeAttendanceStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum ChangeAttendanceDecisionStatus {
  WAITLISTED = 'Waitlisted',
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

export enum ChangeAttendanceDay {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
}

@Schema({ timestamps: true, collection: 'change_attendance' })
export class ChangeAttendance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  child!: Types.ObjectId;

  @Prop({ type: String, required: false })
  parentName?: string;

  @Prop({ type: String, required: false })
  contactNumber?: string;

  @Prop({ type: [String], enum: Object.values(ChangeAttendanceDay), required: false })
  days?: ChangeAttendanceDay[];

  @Prop({ type: Date, required: false })
  commenceOn?: Date;

  @Prop({
    type: String,
    enum: Object.values(ChangeAttendanceStatus),
    default: ChangeAttendanceStatus.DRAFT,
    required: false,
  })
  status?: ChangeAttendanceStatus;

  @Prop({
    type: String,
    enum: Object.values(ChangeAttendanceDecisionStatus),
    default: ChangeAttendanceDecisionStatus.PENDING,
    required: false,
  })
  decisionStatus?: ChangeAttendanceDecisionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  publishedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;
}

export const ChangeAttendanceSchema =
  SchemaFactory.createForClass(ChangeAttendance);


