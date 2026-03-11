// src/media/media.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

export enum MediaStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

@Schema({ timestamps: true })
export class Media extends Document {
  @ApiProperty({ description: 'Public URL of the file' })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @Prop({ type: Number })
  size: number;

  @Prop({ default: false })
  isDeleted: boolean; // 👈 we'll use this for soft delete

  @ApiProperty({ enum: MediaType, description: 'Type of media' })
  @Prop({ type: String, enum: Object.values(MediaType), required: true })
  type: MediaType;

  @ApiProperty({ description: 'Uploaded by user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  uploadedBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }],
    default: [],
  })
  campuses: MongooseSchema.Types.ObjectId[];
}

export const MediaSchema = SchemaFactory.createForClass(Media);

// Index for better query performance
MediaSchema.index({ announcement: 1 });
MediaSchema.index({ uploadedBy: 1 });
MediaSchema.index({ type: 1 });
MediaSchema.index({ status: 1 });
