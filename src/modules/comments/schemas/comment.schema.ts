import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  TRASHED = 'trashed',
}

export enum StaffReplyAs {
  INDIVIDUAL = 'individual',
  GROVE_ACADEMY = 'grove_academy',
}

@Schema({ timestamps: true, collection: 'comments' })
export class Comment extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  parentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  announcementId: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'], 
    default: 'announcement' 
  })
  entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';

  @Prop({ required: true, trim: true, maxlength: 1000 })
  content: string;

  @Prop({ 
    type: String, 
    enum: Object.values(CommentStatus), 
    default: CommentStatus.PENDING 
  })
  status: CommentStatus;

  @Prop({ type: Boolean, default: false })
  isStaffReply: boolean;

  @Prop({ 
    type: String, 
    enum: Object.values(StaffReplyAs), 
    default: StaffReplyAs.GROVE_ACADEMY 
  })
  staffReplyAs: StaffReplyAs;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  repliedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Comment' })
  parentCommentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campusId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  deletedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  approvedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy: MongooseSchema.Types.ObjectId;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for performance optimization
CommentSchema.index({ announcementId: 1, entityType: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ announcementId: 1, entityType: 1, status: 1, createdAt: -1 });
CommentSchema.index({ campusId: 1, entityType: 1, status: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, entityType: 1, createdAt: -1 });
CommentSchema.index({ repliedBy: 1, entityType: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1, entityType: 1, createdAt: -1 });
CommentSchema.index({ isDeleted: 1, entityType: 1, createdAt: -1 });
