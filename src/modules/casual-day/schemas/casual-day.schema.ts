import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CasualDayStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum CasualDayDecisionStatus {
  WAITLISTED = 'Waitlisted',
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed',
}

@Schema({ timestamps: true, collection: 'casual_days' })
export class CasualDay extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: String, required: false })
  parentName?: string;

  @Prop({ type: String, required: false })
  parentEmail?: string;

  @Prop({ type: String, required: false })
  contactNumber?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Child', required: false })
  children?: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, required: false })
  replaceChildOnHoliday?: string;

  @Prop({
    type: String,
    enum: Object.values(CasualDayStatus),
    default: CasualDayStatus.DRAFT,
  })
  status!: CasualDayStatus;

  @Prop({
    type: String,
    enum: Object.values(CasualDayDecisionStatus),
    default: CasualDayDecisionStatus.PENDING,
    required: false,
  })
  decisionStatus?: CasualDayDecisionStatus;

  @Prop({ type: String, required: false })
  comments?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const CasualDaySchema = SchemaFactory.createForClass(CasualDay);




