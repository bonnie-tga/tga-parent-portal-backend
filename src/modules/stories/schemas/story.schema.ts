import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum StoryStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum StoryMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  OTHER = 'other',
}

@Schema({ _id: false })
export class StoryMediaItem {
  @Prop({ type: String, required: true })
  url!: string;

  @Prop({ type: String, required: true })
  fileName!: string;

  @Prop({ type: String, enum: Object.values(StoryMediaType), required: true })
  type!: StoryMediaType;
}

export const StoryMediaItemSchema = SchemaFactory.createForClass(StoryMediaItem);

@Schema({ timestamps: true, collection: 'stories' })
export class Story extends Document {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Room' }], default: [] })
  rooms!: Types.ObjectId[];

  @Prop({
    type: [StoryMediaItemSchema],
    default: [],
  })
  media!: StoryMediaItem[];

  @Prop({ type: StoryMediaItemSchema, required: false })
  videoPoster?: StoryMediaItem;

  @Prop({
    type: String,
    enum: Object.values(StoryStatus),
    default: StoryStatus.DRAFT,
  })
  status!: StoryStatus;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const StorySchema = SchemaFactory.createForClass(Story);


