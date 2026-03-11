import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FeedItemDocument = HydratedDocument<FeedItem>;

@Schema({ timestamps: true, collection: 'feed_items' })
export class FeedItem {
  @Prop({
    type: String,
    enum: [
      'announcement',
      'event',
      'poll',
      'survey',
      'daily-journal',
      'breakfast',
      'grove-curriculum',
      'year-report',
      'learning-journey',
      'immunisation-reminder',
      'new-staff',
    ],
    required: true,
  })
  type!:
    | 'announcement'
    | 'event'
    | 'poll'
    | 'survey'
    | 'daily-journal'
    | 'breakfast'
    | 'grove-curriculum'
    | 'year-report'
    | 'learning-journey'
    | 'immunisation-reminder'
    | 'new-staff';

  // reference to the source doc (Announcement/Event/Poll)
  @Prop({ 
    type: Types.ObjectId, 
    required: true,
    refPath: 'refModel'  // Dynamic reference based on refModel field
  })
  refId!: Types.ObjectId;

  // Virtual field to determine which model to populate
  @Prop({
    type: String,
    enum: [
      'Announcement',
      'Event',
      'Poll',
      'Survey',
      'DailyJournal',
      'Breakfast',
      'GroveCurriculum',
      'YearReport',
      'LearningJourney',
      'ImmunisationReminder',
      'User',
    ],
    required: false
  })
  refModel?: string;

  @Prop({ type: Boolean, default: false })
  isForAllCampuses!: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Campus', default: [] })
  campuses!: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Room', default: [] })
  rooms!: Types.ObjectId[];

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  mediaUrls!: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  // optional scheduling for visibility
  @Prop()
  visibleFrom?: Date;

  @Prop()
  visibleUntil?: Date;

  @Prop({ type: String, enum: ['active', 'archived'], default: 'active' })
  status!: 'active' | 'archived';

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Boolean, default: false })
  isPinned!: boolean;

  @Prop({ type: Number, default: 0 })
  viewCount!: number;
}

export const FeedItemSchema = SchemaFactory.createForClass(FeedItem);

// Targeting + sort
FeedItemSchema.index({
  isForAllCampuses: 1,
  campuses: 1,
  status: 1,
  visibleFrom: 1,
  visibleUntil: 1,
  createdAt: -1,
});

FeedItemSchema.index({ type: 1, refId: 1 });
FeedItemSchema.index({ isPinned: 1, createdAt: -1 });

