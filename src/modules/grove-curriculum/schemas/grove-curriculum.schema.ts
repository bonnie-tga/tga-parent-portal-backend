import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum GroveCurriculumStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PUBLISH = 'Publish',
}

export enum Months {
  JANUARY = 'January',
  FEBRUARY = 'February',
  MARCH = 'March',
  APRIL = 'April',
  MAY = 'May',
  JUNE = 'June',
  JULY = 'July',
  AUGUST = 'August',
  SEPTEMBER = 'September',
  OCTOBER = 'October',
  NOVEMBER = 'November',
  DECEMBER = 'December',
}

export enum Years {
  Y2025 = '2025',
  Y2026 = '2026',
  Y2027 = '2027',
  Y2028 = '2028',
}

@Schema({ _id: false })
export class Environment {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  purpose?: string;

  @Prop({ type: Boolean, required: false, default: false })
  schoolReadiness?: boolean;
}

export const EnvironmentSchema = SchemaFactory.createForClass(Environment);

@Schema({ _id: false })
export class SpontaneousLearning {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  title?: string;
}

export const SpontaneousLearningSchema = SchemaFactory.createForClass(SpontaneousLearning);

@Schema({ _id: false })
export class OutdoorLearning {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  purpose?: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], required: true })
  children?: MongooseSchema.Types.ObjectId[];
}

export const OutdoorLearningSchema = SchemaFactory.createForClass(OutdoorLearning);

@Schema({ _id: false })
export class GroveCategory {
  @Prop({ type: [EnvironmentSchema], default: [] })
  environment?: Environment[];

  @Prop({ type: [SpontaneousLearningSchema], default: [] })
  spontaneousLearning?: SpontaneousLearning[];

  @Prop({ type: [OutdoorLearningSchema], default: [] })
  outdoorLearning?: OutdoorLearning[];
}

export const GroveCategorySchema = SchemaFactory.createForClass(GroveCategory);

@Schema({ _id: false })
export class FamilyFeedBack {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  parent?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: false })
  comment?: string;

  @Prop({ type: String, required: false })
  myDayTitle?: string;
}

export const FamilyFeedBackSchema = SchemaFactory.createForClass(FamilyFeedBack);

@Schema({ timestamps: true })
export class GroveCurriculum extends Document {
  @Prop({ type: String, enum: Object.values(Months), required: false })
  month?: Months;

  @Prop({ type: String, enum: Object.values(Years), required: false })
  year?: Years;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: [GroveCategorySchema], default: [] })
  groveBody?: GroveCategory[];

  @Prop({ type: [GroveCategorySchema], default: [] })
  groveMind?: GroveCategory[];

  @Prop({ type: [GroveCategorySchema], default: [] })
  groveHeart?: GroveCategory[];

  @Prop({ type: [GroveCategorySchema], default: [] })
  groveCompass?: GroveCategory[];

  @Prop({ type: [GroveCategorySchema], default: [] })
  groveExpression?: GroveCategory[];

  @Prop({ type: [FamilyFeedBackSchema], default: [] })
  familyFeedBack?: FamilyFeedBack[];

  @Prop({ type: String, required: false })
  whereToNext?: string;

  @Prop({ type: String, required: false })
  schoolReadinessFocusPoint?: string;

  @Prop({ type: String, enum: Object.values(GroveCurriculumStatus), required: true })
  status?: GroveCurriculumStatus;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  updatedBy?: MongooseSchema.Types.ObjectId;
}

export const GroveCurriculumSchema = SchemaFactory.createForClass(GroveCurriculum);


