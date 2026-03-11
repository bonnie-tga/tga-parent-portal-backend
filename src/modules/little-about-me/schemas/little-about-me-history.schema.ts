import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'littleaboutmehistory' })
export class LittleAboutMeHistory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LittleAboutMe', required: true })
  littleAboutMeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  child!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  parent!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy!: Types.ObjectId;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  preferredName?: string;

  @Prop({ type: String })
  specialPeople?: string;

  @Prop({ type: String })
  callMother?: string;

  @Prop({ type: String })
  callFather?: string;

  @Prop({ type: String })
  enjoys?: string;

  @Prop({ type: String })
  favoriteToy?: string;

  @Prop({ type: String })
  afraidOf?: string;

  @Prop({ type: String })
  restActivity?: string;

  @Prop({ type: String })
  clothingNeeds?: string;

  @Prop({ type: String })
  restTimeNappies?: string;

  @Prop({ type: String })
  comforters?: string;

  @Prop({ type: String })
  nappiesAllDay?: string;

  @Prop({ type: String })
  toiletTraining?: string;

  @Prop({ type: String })
  feedingRequirements?: string;

  @Prop({ type: String })
  milkFormula?: string;

  @Prop({ type: String })
  milkDetails?: string;

  @Prop({ type: Object })
  milkFormulaEntries?: any;

  @Prop({ type: String })
  sleepsPerDay?: string;

  @Prop({ type: String })
  sleepDuration?: string;

  @Prop({ type: String })
  medication?: string;

  @Prop({ type: String })
  developmentalPatterns?: string;

  @Prop({ type: String })
  specialRequests?: string;

  @Prop({ type: String })
  additionalComments?: string;

  @Prop({ type: String })
  routine?: string;

  @Prop({ type: Object })
  routineEntries?: any;

  @Prop({ type: Boolean })
  wellnessObservationsUpToDate?: boolean;

  @Prop({ type: Object })
  transitionEvaluationEntries?: any;

  @Prop({ type: Object })
  signedParent?: any;

  @Prop({ type: Object })
  signedStaff?: any;

  @Prop({ type: String })
  status?: string;

  @Prop({ type: Date })
  publishedAt?: Date;
}

export const LittleAboutMeHistorySchema = SchemaFactory.createForClass(LittleAboutMeHistory);
