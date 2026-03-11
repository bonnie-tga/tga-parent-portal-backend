import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TransferNoticeStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum TransferNoticeDecisionStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

@Schema({ timestamps: true, collection: 'transfer_notices' })
export class TransferNotice extends Document {
  @Prop({ type: [Types.ObjectId], ref: 'Child', required: true })
  children!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  oldCampus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: false })
  newCampus?: Types.ObjectId;

  @Prop({ type: String, required: false })
  linkToWithdrawalNotice?: string;

  @Prop({
    type: String,
    enum: Object.values(TransferNoticeStatus),
    default: TransferNoticeStatus.DRAFT,
  })
  status!: TransferNoticeStatus;

  @Prop({
    type: String,
    enum: Object.values(TransferNoticeDecisionStatus),
    default: TransferNoticeDecisionStatus.PENDING,
    required: false,
  })
  decisionStatus?: TransferNoticeDecisionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const TransferNoticeSchema =
  SchemaFactory.createForClass(TransferNotice);

