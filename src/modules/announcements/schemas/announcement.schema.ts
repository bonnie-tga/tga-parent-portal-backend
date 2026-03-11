import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum AnnouncementType {
  ANNOUNCEMENT = 'announcement',
  EVENT = 'event',
}

export enum AnnouncementScope {
  CAMPUS = 'campus',
  ROOM = 'room',
  ALL = 'all',
}

export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  TRASHED = 'trashed',
}

export enum AnnouncementVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
}

@Schema({ timestamps: true })
export class Announcement extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  shortDescription: string;

  @Prop({ type: String, enum: Object.values(AnnouncementType), required: true })
  type: AnnouncementType;

  @Prop({ type: String, enum: Object.values(AnnouncementScope), required: true })
  scope: AnnouncementScope;

  @Prop({ type: String, enum: Object.values(AnnouncementStatus), default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Prop({ type: String, enum: Object.values(AnnouncementVisibility), default: AnnouncementVisibility.PUBLIC })
  visibility: AnnouncementVisibility;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }], default: [] })
  campuses: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }], default: [] })
  rooms: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: Date })
  publishDate: Date;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: String })
  featuredImage: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  deletedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isCommentEnabled: boolean;

  @Prop({ type: Number, default: 0 })
  likeCount: number;

  @Prop({ type: Number, default: 0 })
  commentCount: number;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
