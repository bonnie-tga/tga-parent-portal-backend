import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ParentChatStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum ParentChatDecisionStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'parent_chats' })
export class ParentChat extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], default: [] })
  children: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(ParentChatStatus),
    default: ParentChatStatus.DRAFT,
  })
  status: ParentChatStatus;

  @Prop({
    type: String,
    enum: Object.values(ParentChatDecisionStatus),
    default: ParentChatDecisionStatus.OPEN,
  })
  decisionStatus: ParentChatDecisionStatus;

  @Prop({ type: Number, default: 0 })
  // TODO: Deprecated - Use per-user unread count from ChatMessage.readBy array instead
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

export const ParentChatSchema = SchemaFactory.createForClass(ParentChat);
