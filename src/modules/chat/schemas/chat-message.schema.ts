import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ChatAttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChatThread', required: true, index: true })
  threadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  senderRole: string;

  @Prop({ type: String, required: false })
  message: string;

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: Object.values(ChatAttachmentType), required: true },
        name: { type: String },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
    default: [],
  })
  attachments: Array<{
    url: string;
    type: ChatAttachmentType;
    name?: string;
    size?: number;
    mimeType?: string;
  }>;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  readBy: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ threadId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1, createdAt: -1 });
