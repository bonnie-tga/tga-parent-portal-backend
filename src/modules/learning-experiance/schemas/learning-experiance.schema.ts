import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum GroveCategory {
  GROVE_BODY = 'Grove Body',
  GROVE_HEART = 'Grove Heart',
  GROVE_MIND = 'Grove Mind',
  GROVE_COMPASS = 'Grove Compass',
  GROVE_EXPRESSION = 'Grove Expression'
}

@Schema({ _id: false })
export class LearningExperianceCategory {
  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: String, required: false })
  question?: string;

  @Prop({ type: String, required: false })
  experience?: string;

  @Prop({ type: [String], enum: Object.values(GroveCategory), default: [] })
  groveCategories?: GroveCategory[];
}

export const LearningExperianceCategorySchema = SchemaFactory.createForClass(LearningExperianceCategory);


@Schema({ timestamps: true })
export class LearningExperiance extends Document {
  @Prop({ type: Date, required: false })
  weekBeginning?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: [LearningExperianceCategorySchema], default: [] })
  activities?: LearningExperianceCategory[];

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  updatedBy?: MongooseSchema.Types.ObjectId;
}

export const LearningExperianceSchema = SchemaFactory.createForClass(LearningExperiance);


