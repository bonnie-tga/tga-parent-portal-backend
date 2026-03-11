import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum PhotoStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
}

export enum PhotoVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Schema({ timestamps: true })
export class Photos extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }],
    default: [],
  })
  children: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }],
    default: [],
  })
  excludeChildren: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Number, required: true })
  year: number;

  @Prop({ type: Date, required: false })
  downloadSchedule?: Date;

  @Prop({ type: String, required: true })
  sendTo: string;

  @Prop({
    type: String,
    enum: Object.values(PhotoStatus),
    default: PhotoStatus.DRAFT,
  })
  status: PhotoStatus;

  @Prop({
    type: String,
    enum: Object.values(PhotoVisibility),
    default: PhotoVisibility.PUBLIC,
  })
  visibility: PhotoVisibility;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Number, default: 0 })
  mediaCount: number;

  @Prop({ type: String })
  downloadToken?: string;

  @Prop({ type: Date })
  downloadRequestedAt?: Date;

  @Prop({ type: Date })
  downloadExpiresAt?: Date;

  @Prop({ type: Date })
  downloadCompletedAt?: Date;

  @Prop({ type: String })
  downloadUrl?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  updatedBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: false })
  publishedAt?: Date;
}

export const PhotosSchema = SchemaFactory.createForClass(Photos);
