import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum ChatThreadType {
  PARENT = 'PARENT',
  ACCOUNT = 'ACCOUNT',
  TEAM = 'TEAM',
  MANAGEMENT = 'MANAGEMENT',
  STAFF = 'STAFF',
}

export enum ChatThreadStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum ChatThreadDecisionStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'chat_threads' })
export class ChatThread extends Document {
  @Prop({
    type: String,
    enum: Object.values(ChatThreadType),
    required: true,
  })
  type: ChatThreadType;

  @Prop({ 
    type: Types.ObjectId, 
    refPath: 'refModel'
  })
  refId?: Types.ObjectId;

  @Prop({ 
    type: String,
    enum: [
      'ParentChat',
      'AccountChat',
      'TeamChat',
      'ManagementChat',
      'StaffChat',
    ],
  })
  refModel?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus' })
  campus?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room' })
  room?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ChatThreadStatus),
    default: ChatThreadStatus.DRAFT,
  })
  status: ChatThreadStatus;

  @Prop({
    type: String,
    enum: Object.values(ChatThreadDecisionStatus),
    default: ChatThreadDecisionStatus.OPEN,
  })
  decisionStatus: ChatThreadDecisionStatus;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const ChatThreadSchema = SchemaFactory.createForClass(ChatThread);

ChatThreadSchema.index({ type: 1, isDeleted: 1 });
ChatThreadSchema.index({ campus: 1, isDeleted: 1 });
ChatThreadSchema.index({ room: 1, isDeleted: 1 });
ChatThreadSchema.index({ members: 1, isDeleted: 1 });
ChatThreadSchema.index({ refId: 1, refModel: 1 });
ChatThreadSchema.index({ createdAt: -1 });
