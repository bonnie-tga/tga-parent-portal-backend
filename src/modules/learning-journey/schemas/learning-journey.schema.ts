import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LearningJourneyStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

@Schema({ _id: false })
export class LearningJourneyFuturePlanningItem {
  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String })
  possibility?: string;

  @Prop({ type: String })
  intentionalTeaching?: string;
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

@Schema({ _id: false })
export class SpontaneousLearning {
  @Prop({ type: Date })
  date?: Date;
  @Prop({ type: String })
  purpose?: string;
}

@Schema({ _id: false })
export class GoalEvaluation {
  @Prop({ type: String })
  goalEvaluationsId?: string;

  @Prop({ type: String })
  goal?: string;

  @Prop({ type: String })
  evaluation?: string;

  @Prop({ type: Boolean, default: false })
  complete?: boolean;
}

export const LearningJourneyFuturePlanningItemSchema =
  SchemaFactory.createForClass(LearningJourneyFuturePlanningItem);

export const IndividualLearningSchema = SchemaFactory.createForClass(IndividualLearning);

export const SpontaneousLearningSchema = SchemaFactory.createForClass(SpontaneousLearning);

export const GoalEvaluationSchema = SchemaFactory.createForClass(GoalEvaluation);

@Schema({ timestamps: true, collection: 'learningjourneys' })
export class LearningJourney extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  children!: Types.ObjectId;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: Date })
  publishedDate?: Date;

  @Prop({ type: String })
  monthOne?: string;

  @Prop({ type: String })
  monthTwo?: string;

  @Prop({ type: String })
  year?: string;

  @Prop({ type: [IndividualLearningSchema], default: [] })
  individualLearning?: IndividualLearning[];

  @Prop({ type: [SpontaneousLearningSchema], default: [] })
  spontaneousLearning?: SpontaneousLearning[];

  @Prop({ type: String })
  previousStrengths?: string;

  @Prop({ type: String })
  newStrengths?: string;

  @Prop({ type: String })
  newInterests?: string;

  @Prop({ type: [GoalEvaluationSchema], default: [] })
  goalEvaluations?: GoalEvaluation[];

  @Prop({ type: [String], default: [] })
  newGoals?: string[];

  @Prop({ type: Object })
  educationalTheorists?: Record<string, unknown>;

  @Prop({ type: Object })
  outcomes?: Record<string, unknown>;

  @Prop({
    type: [LearningJourneyFuturePlanningItemSchema],
    default: [],
  })
  futurePlanning?: LearningJourneyFuturePlanningItem[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  completedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  allowComments?: boolean;

  @Prop({ type: Boolean, default: false })
  allowTrackbacks?: boolean;

  @Prop({
    type: String,
    enum: Object.values(LearningJourneyStatus),
    default: LearningJourneyStatus.DRAFT,
  })
  status!: LearningJourneyStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Number, default: 0 })
  likeCount?: number;

  @Prop({ type: Number, default: 0 })
  commentCount?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedByParents?: Types.ObjectId[];
}

export const LearningJourneySchema = SchemaFactory.createForClass(LearningJourney);


