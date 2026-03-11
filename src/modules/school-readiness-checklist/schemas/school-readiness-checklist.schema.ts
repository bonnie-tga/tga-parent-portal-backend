import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SchoolReadinessChecklistStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum SchoolReadinessChecklistValue {
  ACHIEVED = 'A',
  WORKING_TOWARDS = 'WT',
}

@Schema({ _id: false })
export class SchoolReadinessChecklistItem {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  question?: string;

  @Prop({ type: String, enum: Object.values(SchoolReadinessChecklistValue), required: false })
  value?: SchoolReadinessChecklistValue;
}

export const SchoolReadinessChecklistItemSchema =
  SchemaFactory.createForClass(SchoolReadinessChecklistItem);

@Schema({ timestamps: true, collection: 'schoolreadinesschecklists' })
export class SchoolReadinessChecklist extends Document {
  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  children: Types.ObjectId;

  @Prop({ type: [SchoolReadinessChecklistItemSchema], default: [] })
  checklist: SchoolReadinessChecklistItem[];

  @Prop({ type: String })
  extendedComment?: string;

  @Prop({ type: [String], default: [] })
  attachments?: string[];

  @Prop({ type: Boolean, default: false })
  allowComments?: boolean;

  @Prop({ type: Boolean, default: false })
  allowTrackbacks?: boolean;

  @Prop({
    type: String,
    enum: Object.values(SchoolReadinessChecklistStatus),
    default: SchoolReadinessChecklistStatus.DRAFT,
  })
  status: SchoolReadinessChecklistStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const SchoolReadinessChecklistSchema =
  SchemaFactory.createForClass(SchoolReadinessChecklist);



