import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WithdrawalNoticeStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum WithdrawalNoticeDecisionStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
}

export enum WithdrawalNoticeReason {
  FINANCIAL = 'Financial',
  MOVING_HOUSE = 'Moving House',
  CHANGE_OF_WORK_CIRCUMSTANCES = 'Change of Work Circumstances',
  HOURS_OF_OPERATION = 'Hours of Operation',
  UNHAPPY_WITH_CENTRE = 'Unhappy With Centre',
  GOING_TO_SCHOOL = 'Going to School',
  TRANSFER_BETWEEN_SERVICES = 'Transfer Between Services',
  OTHER = 'Other',
}

export enum WithdrawalNoticeHappyWithService {
  YES = 'Yes',
  NO = 'No',
}

@Schema({ timestamps: true, collection: 'withdrawal_notices' })
export class WithdrawalNotice extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Child', required: true })
  children!: Types.ObjectId[];

  @Prop({ type: String, required: true })
  parentName!: string;

  @Prop({ type: String, required: false })
  contactNumber?: string;

  @Prop({ type: Date, required: true })
  dateNoticeGiven!: Date;

  @Prop({ type: Date, required: true })
  lastDayOfAttendance!: Date;

  @Prop({
    type: String,
    enum: Object.values(WithdrawalNoticeReason),
    required: true,
  })
  reason!: WithdrawalNoticeReason;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: false })
  newCentre?: Types.ObjectId;

  @Prop({ type: String, required: false })
  other?: string;

  @Prop({
    type: String,
    enum: Object.values(WithdrawalNoticeHappyWithService),
    required: false,
  })
  happyWithService?: WithdrawalNoticeHappyWithService;

  @Prop({ type: String, required: false })
  feedback?: string;

  @Prop({
    type: String,
    enum: Object.values(WithdrawalNoticeStatus),
    default: WithdrawalNoticeStatus.DRAFT,
  })
  status!: WithdrawalNoticeStatus;

  @Prop({
    type: String,
    enum: Object.values(WithdrawalNoticeDecisionStatus),
    required: false,
  })
  decisionStatus?: WithdrawalNoticeDecisionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const WithdrawalNoticeSchema =
  SchemaFactory.createForClass(WithdrawalNotice);




