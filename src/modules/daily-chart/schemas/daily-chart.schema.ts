import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum DailyChartStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  PENDING = 'Pending',
  SCHEDULED = 'Scheduled',
}

export enum DailyChartVisibility {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

export enum BottleAmount {
  NONE = '-',
  ML_50 = '50 ml',
  ML_60 = '60 ml',
  ML_70 = '70 ml',
  ML_80 = '80 ml',
  ML_90 = '90 ml',
  ML_100 = '100 ml',
  ML_110 = '110 ml',
  ML_120 = '120 ml',
  ML_130 = '130 ml',
  ML_140 = '140 ml',
  ML_150 = '150 ml',
  ML_160 = '160 ml',
  ML_170 = '170 ml',
  ML_180 = '180 ml',
  ML_190 = '190 ml',
  ML_200 = '200 ml',
  ML_210 = '210 ml',
  NO_THANKS = 'No Thanks',
}


export enum DailyChartMeal {
  MORNING_TEA = 'morning_tea',
  LUNCH = 'lunch',
  AFTERNOON_TEA = 'afternoon_tea',
  CRUNCH_AND_SIP = 'crunch_and_sip',
}

export enum WaterOptions {
  NONE = '-',
  QUARTER_CUP = '1/4 Cup',
  HALF_CUP = '1/2 Cup',
  THREE_QUARTER_CUP = '3/4 Cup',
  FULL_CUP = 'Full Cup',
  LITTLE = 'Little',
  NO_THANKS = 'No Thanks',
  LATE = 'Late',
  LEFT_EARLY = 'Left Early',
  ALTERNATIVE = 'Alternative',
}


export enum FruitQuantity {
  TWO_SLICES = 'two_slices',
  FOUR_SLICES = 'four_slices',
  SIX_SLICES = 'six_slices',
  LITTLE = 'little',
  NO_THANKS = 'no_thanks',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  ALTERNATIVE = 'alternative',
}


export enum TeaLunch {
  HALF = 'half',
  ONE = 'one',
  ONE_AND_HALF = 'one_and_half',
  TWO = 'two',
  TWO_AND_HALF = 'two_and_half',
  THREE = 'three',
  THREE_AND_HALF = 'three_and_half',
  FOUR = 'four',
  FOUR_AND_HALF = 'four_and_half',
  FIVE = 'five',
  LITTLE = 'little',
  NO_THANKS = 'no_thanks',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  ALTERNATIVE = 'alternative',
}

export enum DailyChartTimeSlot {
  morning = '8:30 AM',
  lunch = '11:00 AM',
  afternoon = '2:00 PM',
}

@Schema({ _id: false })
export class BottleEntry {
  @Prop({ type: [String], enum: Object.values(BottleAmount), default: [] })
  amount?: BottleAmount[];

  @Prop({ type: String, required: false })
  time?: string;
}

export const BottleEntrySchema = SchemaFactory.createForClass(BottleEntry);

@Schema({ _id: false })
export class ChildBottle {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: false })
  child?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [BottleEntrySchema], default: [] })
  bottles?: BottleEntry[];
}

export const ChildBottleSchema = SchemaFactory.createForClass(ChildBottle);

@Schema({ _id: false })
export class DailyChartChecklist {

  @Prop({ type: String, required: false })
  morning?: string;

  @Prop({ type: String, required: false })
  lunch?: string;

  @Prop({ type: String, required: false })
  afternoon?: string;

  @Prop({ type: String, required: false })
  crunchAndSip?: string;

}

export const DailyChartChecklistSchema = SchemaFactory.createForClass(DailyChartChecklist);

@Schema({ _id: false })
export class DailyChartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: false })
  child?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TeaLunch), required: false })
  tea_lunch?: TeaLunch;

  @Prop({ type: [BottleEntrySchema], default: [] })
  bottles?: BottleEntry[];

  @Prop({ type: String, enum: Object.values(FruitQuantity), required: false })
  fruit_quantity?: FruitQuantity;

  @Prop({ type: String, enum: Object.values(WaterOptions), required: false })
  water_options?: WaterOptions;

  @Prop({ type: String, required: false })
  comments?: string;
}

export const DailyChartItemSchema = SchemaFactory.createForClass(DailyChartItem);

@Schema({ _id: false })
export class DailyChartCategoryItems {
  @Prop({ type: [DailyChartItemSchema], default: [] })
  morning_tea?: DailyChartItem[];

  @Prop({ type: [DailyChartItemSchema], default: [] })
  lunch?: DailyChartItem[];

  @Prop({ type: [DailyChartItemSchema], default: [] })
  afternoon_tea?: DailyChartItem[];

  @Prop({ type: [DailyChartItemSchema], default: [] })
  crunch_and_sip?: DailyChartItem[];
}

export const DailyChartCategoryItemsSchema = SchemaFactory.createForClass(DailyChartCategoryItems);

@Schema({ timestamps: true })
export class DailyChart extends Document {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], required: true })
  children: MongooseSchema.Types.ObjectId[];

  @Prop({ type: DailyChartCategoryItemsSchema, default: {} })
  dailyChartItems?: DailyChartCategoryItems;

  @Prop({ type: String, required: false })
  morningTea?: string;

  @Prop({ type: String, required: false })
  lunch?: string;

  @Prop({ type: String, required: false })
  afternoonTea?: string;

  @Prop({ type: String, enum: Object.values(DailyChartMeal), required: false })
  category: DailyChartMeal;

  @Prop({ type: [ChildBottleSchema], default: [] })
  childrenBottles?: ChildBottle[];

  @Prop({ type: DailyChartChecklistSchema, default: null })
  dailyChartChecklist?: DailyChartChecklist;

  @Prop({ type: String, enum: Object.values(DailyChartStatus), default: DailyChartStatus.DRAFT })
  status: DailyChartStatus;

  @Prop({ type: String, enum: Object.values(DailyChartTimeSlot), default: DailyChartTimeSlot.morning })
  time?: DailyChartTimeSlot;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: false })
  publishedAt?: Date;

  @Prop({ type: Date, required: false })
  scheduleAt?: Date;

  @Prop({ type: String, enum: Object.values(DailyChartVisibility), default: DailyChartVisibility.PUBLIC })
  visibility?: DailyChartVisibility;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const DailyChartSchema = SchemaFactory.createForClass(DailyChart);


