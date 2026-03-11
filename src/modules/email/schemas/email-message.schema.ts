import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class EmailMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isSent: boolean;

  @Prop({ required: false })
  error?: string;

  @Prop({ required: false })
  errorDetails?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: {
    type?: string;
    photoId?: string;
    downloadUrl?: string;
    expiresAt?: Date;
    mediaCount?: number;
  };
}

export type EmailMessageDocument = EmailMessage & Document;
export const EmailMessageSchema = SchemaFactory.createForClass(EmailMessage);
