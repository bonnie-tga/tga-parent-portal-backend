import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum EventStatus {
  PUBLISHED = 'Published',
  DRAFT = 'Draft',
}

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Date })
  publishedDate?: Date;

  @Prop({ type: Date })
  lastModified?: Date;

  @Prop({ type: Boolean, required: true, default: false })
  rsvpRequired: boolean;

  @Prop({ type: Boolean, default: false })
  sendSurveyAfterEvent?: boolean;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }],
    default: [],
  })
  campus: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }], default: [] })
  room: MongooseSchema.Types.ObjectId[];

  @Prop({ trim: true })
  pdfUrl?: string;

  @Prop({ trim: true })
  thumbnailUrl?: string;

  @Prop({ trim: true })
  bannerUrl?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  likedByUsers: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  likedByParents: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  totalLikes: number;


  @Prop({ type: String, enum: Object.values(EventStatus), default: EventStatus.DRAFT })
  status: EventStatus;

  @Prop({ trim: true })
  shortDescription?: string;

  @Prop({ trim: true })
  pdfDescription?: string;

  @Prop({ trim: true })
  content?: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Boolean, default: true })
  isCommentEnabled: boolean;

  @Prop({ type: Number, default: 0 })
  likeCount: number;

  @Prop({ type: Number, default: 0 })
  commentCount: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Include virtuals in JSON/object outputs
EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

// Virtual: whether the event has ended based on endDate/endTime (or startDate if no endDate)
EventSchema.virtual('isClosed').get(function (this: Event) {
  const now = new Date();

  // Determine base date for end
  const baseDate: Date | undefined = this.endDate || this.startDate;
  if (!baseDate) return false;

  const end = new Date(baseDate);

  // If endTime is provided, use it (HH:mm)
  if (this.endTime && typeof this.endTime === 'string') {
    const [hStr, mStr] = this.endTime.split(':');
    const hours = Number(hStr);
    const minutes = Number(mStr);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      end.setHours(hours, minutes, 59, 999);
    }
  } else {
    // No endTime: assume end of day
    end.setHours(23, 59, 59, 999);
  }

  return now.getTime() > end.getTime();
});


