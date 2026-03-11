import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ManagementChatStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum ManagementChatDecisionStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'management_chats' })
export class ManagementChat extends Document {
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
    enum: Object.values(ManagementChatStatus),
    default: ManagementChatStatus.DRAFT,
  })
  status: ManagementChatStatus;

  @Prop({
    type: String,
    enum: Object.values(ManagementChatDecisionStatus),
    default: ManagementChatDecisionStatus.OPEN,
  })
  decisionStatus: ManagementChatDecisionStatus;

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

export const ManagementChatSchema = SchemaFactory.createForClass(ManagementChat);
