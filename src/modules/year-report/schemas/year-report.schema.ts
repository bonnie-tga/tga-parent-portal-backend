import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum YearReportStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

@Schema({ _id: false })
export class IndividualLearning {
  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: [String] })
  photos?: string[];

  @Prop({ type: String })
  learning?: string;
}

export const IndividualLearningSchema = SchemaFactory.createForClass(IndividualLearning);

@Schema({ timestamps: true, collection: 'yearreports' })
export class YearReport extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  children: Types.ObjectId;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String })
  preparedBy?: string;

  @Prop({ type: Date })
  reportPeriodStart?: Date;

  @Prop({ type: Date })
  reportPeriodEnd?: Date;

  @Prop({ type: String })
  year?: string;

  @Prop({ type: String })
  developmentalSummary?: string;

  @Prop({ type: String })
  goalEvaluation?: string;

  @Prop({ type: Object })
  groveTheory?: any;

  @Prop({ type: Object })
  educationalTheorists?: any;

  @Prop({ type: Object })
  achievementGroup?: any;

  @Prop({ type: Boolean, default: false })
  allowComments?: boolean;

  @Prop({ type: Boolean, default: false })
  allowTrackbacksAndPingbacks?: boolean;

  @Prop({ type: Object })
  outcomes?: any;

  @Prop({ type: Object })
  milestoneResponses?: Record<string, Record<string, 'exceeding' | 'meeting' | 'working_towards'>>;

  @Prop({ type: Object })
  milestoneComments?: Record<string, Record<string, string>>;

  @Prop({ type: [IndividualLearningSchema], default: [] })
  individualLearning?: IndividualLearning[];

  @Prop({ type: String, enum: Object.values(YearReportStatus), default: YearReportStatus.DRAFT })
  status: YearReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  likeCount?: number;

  @Prop({ type: Number, default: 0 })
  commentCount?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedByParents?: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;
}

export const YearReportSchema = SchemaFactory.createForClass(YearReport);


