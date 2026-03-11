import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum AccountChatStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum AccountChatDecisionStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'account_chats' })
export class AccountChat extends Document {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }], default: [] })
  campus: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }], default: [] })
  room: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], default: [] })
  children: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(AccountChatStatus),
    default: AccountChatStatus.DRAFT,
  })
  status: AccountChatStatus;

  @Prop({
    type: String,
    enum: Object.values(AccountChatDecisionStatus),
    default: AccountChatDecisionStatus.OPEN,
  })
  decisionStatus: AccountChatDecisionStatus;

  @Prop({ type: Number, default: 0 })
  newMessage: number;

  @Prop({ type: Date })
  publishAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  deletedBy: MongooseSchema.Types.ObjectId;
}

export const AccountChatSchema = SchemaFactory.createForClass(AccountChat);
