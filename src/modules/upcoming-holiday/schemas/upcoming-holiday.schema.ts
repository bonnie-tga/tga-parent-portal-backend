import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UpcomingHolidayStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum UpcomingHolidayDecisionStatus {
  WAITLISTED = 'Waitlisted',
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

@Schema({ timestamps: true, collection: 'upcoming_holidays' })
export class UpcomingHoliday extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Child', required: true })
  children!: Types.ObjectId[];

  @Prop({ type: Number, required: true })
  numberOfDays!: number;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  endDate!: Date;

  @Prop({
    type: String,
    enum: Object.values(UpcomingHolidayStatus),
    default: UpcomingHolidayStatus.DRAFT,
  })
  status!: UpcomingHolidayStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Child', required: false })
  replaceByChildrenOnCasualDay?: Types.ObjectId[];

  @Prop({ type: Date, required: false })
  submittedDate?: Date;

  @Prop({
    type: String,
    enum: Object.values(UpcomingHolidayDecisionStatus),
    default: UpcomingHolidayDecisionStatus.PENDING,
    required: false,
  })
  decisionStatus?: UpcomingHolidayDecisionStatus;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const UpcomingHolidaySchema =
  SchemaFactory.createForClass(UpcomingHoliday);




