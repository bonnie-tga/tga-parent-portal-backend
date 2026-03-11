import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { SurveyQuestionType } from '../enums/survey-question-type.enum';

@Schema({ _id: true })
export class SurveyQuestionAnswer {
  @Prop({ required: true })
  surveyQuestionId: string;

  @Prop({ required: false })
  surveyQuestion?: string;

  @Prop({ type: String, required: false, enum: Object.values(SurveyQuestionType) })
  type?: SurveyQuestionType;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  surveyAnswer: string | number | string[];
}

export const SurveyQuestionAnswerSchema = SchemaFactory.createForClass(SurveyQuestionAnswer);

@Schema({ _id: true })
export class SurveyQuestionCategory {
  @Prop({ required: true })
  surveyCategoryId: string;

  @Prop({ required: false })
  categoryName: string;

  @Prop({ type: [SurveyQuestionAnswerSchema], required: true })
  surveyQuestionAnswers: SurveyQuestionAnswer[];
}

export const SurveyQuestionCategorySchema = SchemaFactory.createForClass(SurveyQuestionCategory);

@Schema({ timestamps: true })
export class SurveyResponse extends Document {
  @Prop({ required: true, ref: 'Survey' })
  surveyId: Types.ObjectId;

  @Prop({ required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, ref: 'Campus' })
  campusId: Types.ObjectId;

  @Prop({ type: [SurveyQuestionCategorySchema], required: true })
  surveyQuestionCategory: SurveyQuestionCategory[];

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export type SurveyResponseDocument = SurveyResponse & Document;

export const SurveyResponseSchema = SchemaFactory.createForClass(SurveyResponse);

// Indexes to optimize queries for listing responses by survey and joins
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });
SurveyResponseSchema.index({ campusId: 1 });
SurveyResponseSchema.index({ userId: 1 });

