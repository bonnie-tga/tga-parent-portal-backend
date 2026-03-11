import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { SurveyStatus } from '../enums/survey-status.enum';
import { SurveyQuestionType } from '../enums/survey-question-type.enum';

@Schema({ _id: true })
export class SurveyQuestion {
  @Prop({ required: true, trim: true })
  question: string;

  @Prop({
    required: true,
    enum: Object.values(SurveyQuestionType),
    type: String,
  })
  type: SurveyQuestionType;

  @Prop({ type: [String], default: [] })
  options: string[];
}

export const SurveyQuestionSchema = SchemaFactory.createForClass(SurveyQuestion);

@Schema({ _id: true })
export class SurveyCategory {
  @Prop({ required: true, trim: true })
  categoryName: string;

  @Prop({ type: [SurveyQuestionSchema], default: [] })
  questions: SurveyQuestion[];
}

export const SurveyCategorySchema = SchemaFactory.createForClass(SurveyCategory);

@Schema({ timestamps: true })
export class Survey extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Campus' }],
    default: [],
  })
  campuses: Types.ObjectId[];

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: Boolean, default: false })
  feedbackActioned: boolean;

  @Prop({
    type: String,
    enum: Object.values(SurveyStatus),
    default: 'draft',
    required: true,
  })
  status: SurveyStatus;

  @Prop({ type: [SurveyCategorySchema], default: [] })
  surveyQuestions: SurveyCategory[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export type SurveyDocument = Survey & Document;

export const SurveySchema = SchemaFactory.createForClass(Survey);
