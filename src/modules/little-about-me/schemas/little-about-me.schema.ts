import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LittleAboutMeStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

@Schema({ _id: false })
export class MilkFormulaEntry {
  @Prop({ type: String })
  type?: string;

  @Prop({ type: String })
  amount?: string;

  @Prop({ type: String })
  time?: string;
}

@Schema({ _id: false })
export class RoutineEntry {
  @Prop({ type: String })
  title?: string;

  @Prop({ type: String })
  time?: string;

  @Prop({ type: String })
  routineComments?: string;
}

@Schema({ _id: false })
export class TransitionEvaluationEntry {
  @Prop({ type: String })
  date?: string;

  @Prop({ type: String })
  evaluationComments?: string;

  @Prop({ type: String })
  actionItem?: string;

  @Prop({ type: String })
  dateToBeCompleted?: string;
}

@Schema({ _id: false })
export class StaffSignature {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  educator?: Types.ObjectId;

  @Prop({ type: Date })
  signedDate?: Date;

  @Prop({ type: String })
  signedTime?: string;

  @Prop({ type: String })
  signature?: string;
}

@Schema({ _id: false })
export class ParentSignature {
  @Prop({ type: String })
  signedBy?: string;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String })
  time?: string;

  @Prop({ type: String })
  signature?: string;
}

export const MilkFormulaEntrySchema = SchemaFactory.createForClass(MilkFormulaEntry);
export const RoutineEntrySchema = SchemaFactory.createForClass(RoutineEntry);
export const TransitionEvaluationEntrySchema = SchemaFactory.createForClass(TransitionEvaluationEntry);
export const StaffSignatureSchema = SchemaFactory.createForClass(StaffSignature);
export const ParentSignatureSchema = SchemaFactory.createForClass(ParentSignature);

@Schema({ timestamps: true, collection: 'littleaboutme' })
export class LittleAboutMe extends Document {
  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  child!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  parent!: Types.ObjectId;

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

  @Prop({ type: [MilkFormulaEntrySchema], default: [] })
  milkFormulaEntries?: MilkFormulaEntry[];

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

  @Prop({ type: [RoutineEntrySchema], default: [] })
  routineEntries?: RoutineEntry[];

  @Prop({ type: Boolean, default: false })
  wellnessObservationsUpToDate?: boolean;

  @Prop({ type: [TransitionEvaluationEntrySchema], default: [] })
  transitionEvaluationEntries?: TransitionEvaluationEntry[];

  @Prop({ type: ParentSignatureSchema })
  signedParent?: ParentSignature;

  @Prop({ type: StaffSignatureSchema })
  signedStaff?: StaffSignature;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  latestUpdateBy?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(LittleAboutMeStatus),
    default: LittleAboutMeStatus.DRAFT,
  })
  status!: LittleAboutMeStatus;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const LittleAboutMeSchema = SchemaFactory.createForClass(LittleAboutMe);