import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum BreakfastStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum BreakfastVisibility {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

@Schema({ _id: false })
class BreakfastChildEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: false })
  child?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: false })
  breakfast?: string;
}


@Schema({ timestamps: true })
export class Breakfast extends Document {

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: [BreakfastChildEntry], required: false })
  childrenEntries?: BreakfastChildEntry[];

  @Prop({ type: String, enum: Object.values(BreakfastStatus), default: BreakfastStatus.DRAFT })
  status: BreakfastStatus;

  @Prop({ type: String, enum: Object.values(BreakfastVisibility), default: BreakfastVisibility.PUBLIC })
  visibility?: BreakfastVisibility;

  @Prop({ type: Date, required: false })
  publishedDate?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const BreakfastSchema = SchemaFactory.createForClass(Breakfast);


