import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'likes' })
export class Like extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  announcementId: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'], 
    default: 'announcement' 
  })
  entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campusId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Unique constraint: one like per user per entity
LikeSchema.index(
  { announcementId: 1, entityType: 1, userId: 1 },
  { unique: true, name: 'unique_user_like_per_entity' }
);

// Additional indexes for performance
LikeSchema.index({ announcementId: 1, entityType: 1, createdAt: -1 });
LikeSchema.index({ userId: 1, entityType: 1, createdAt: -1 });
LikeSchema.index({ campusId: 1, entityType: 1, createdAt: -1 });
LikeSchema.index({ isDeleted: 1, entityType: 1, createdAt: -1 });
