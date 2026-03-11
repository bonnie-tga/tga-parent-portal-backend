import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum StaffChatStatus {
  OPEN = 'Open',
  CLOSE = 'Close',
}

@Schema({ timestamps: true, collection: 'staff_chats' })
export class StaffChat extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  currentUser: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  targetUser: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }], default: [] })
  campus: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(StaffChatStatus),
    default: StaffChatStatus.OPEN,
  })
  status: StaffChatStatus;

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

export const StaffChatSchema = SchemaFactory.createForClass(StaffChat);

StaffChatSchema.index({ currentUser: 1, targetUser: 1, isDeleted: 1 });
StaffChatSchema.index({ currentUser: 1, isDeleted: 1 });
StaffChatSchema.index({ targetUser: 1, isDeleted: 1 });
StaffChatSchema.index({ campus: 1, isDeleted: 1 });
