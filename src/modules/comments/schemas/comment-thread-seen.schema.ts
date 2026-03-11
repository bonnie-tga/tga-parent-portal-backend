import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, collection: 'comment_thread_seen' })
export class CommentThreadSeen extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  announcementId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  parentId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: ['announcement', 'event', 'dailyJournal', 'yearReport'],
    required: true,
  })
  entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true })
  lastSeenAt: Date;
}

export const CommentThreadSeenSchema = SchemaFactory.createForClass(CommentThreadSeen);

CommentThreadSeenSchema.index(
  { announcementId: 1, entityType: 1, parentId: 1, userId: 1 },
  { unique: true, name: 'unique_staff_thread_seen' },
);
CommentThreadSeenSchema.index({ userId: 1, lastSeenAt: -1 });
