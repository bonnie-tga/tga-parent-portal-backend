import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum MenuStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum MenuRotation {
  ONE_WEEK_ONLY = 'one_week_only',
  TWO_WEEKS = 'two_weeks',
  THREE_WEEKS = 'three_weeks',
  FOUR_WEEKS = 'four_weeks',
  FIVE_WEEKS = 'five_weeks',
  SIX_WEEKS = 'six_weeks',
}

export enum MealTime {
  MORNING_TEA = 'morning_tea',
  LUNCH = 'lunch',
  AFTERNOON_TEA = 'afternoon_tea',
  LATE_SNACK = 'late_snack',
}

// ✅ Weekday-level schema
@Schema({ _id: false })
export class WeekDays {
  @Prop({ type: String, default: '' })
  Monday: string;

  @Prop({ type: String, default: '' })
  Tuesday: string;

  @Prop({ type: String, default: '' })
  Wednesday: string;

  @Prop({ type: String, default: '' })
  Thursday: string;

  @Prop({ type: String, default: '' })
  Friday: string;
}
export const WeekDaysSchema = SchemaFactory.createForClass(WeekDays);

// ✅ Meal item schema
@Schema({ _id: false })
export class MenuMealItem {
  @Prop({ type: String, enum: Object.values(MealTime), required: true })
  mealTime: MealTime;

  @Prop({ type: WeekDaysSchema, required: true, default: {} })
  weekDays: WeekDays;
}
export const MenuMealItemSchema = SchemaFactory.createForClass(MenuMealItem);

// ✅ Each menu within a rotation (e.g. order 1, 2, 3)
@Schema({ _id: false })
export class MenuWeek {
  @Prop({ type: Number, required: true, min: 1 })
  order: number;

  @Prop({ type: [MenuMealItemSchema], default: [] })
  menuItems: MenuMealItem[];
}
export const MenuWeekSchema = SchemaFactory.createForClass(MenuWeek);

// ✅ Main Menu Schema (Rotation + multiple week menus)
@Schema({ timestamps: true })
export class Menu extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: Object.values(MenuRotation), required: true })
  menuRotation: MenuRotation;

  // ✅ Grouped menus within this rotation
  @Prop({ type: [MenuWeekSchema], default: [] })
  menus: MenuWeek[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  author: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: null })
  rotationStartDate?: Date | null;

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;

  @Prop({ type: String, enum: Object.values(MenuStatus), default: MenuStatus.DRAFT })
  status: MenuStatus;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);
