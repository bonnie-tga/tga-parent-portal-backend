import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ConversationType {
  ROOM_CHAT = 'room_chat',
  ACCOUNT_CHAT = 'account_chat',
  MANAGEMENT_CHAT = 'management_chat',
}

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: String, enum: Object.values(ConversationType), required: true })
  type: ConversationType;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  participants: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child' })
  child: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room' })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus' })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  lastMessageAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
