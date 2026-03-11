import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AbcBehaviourObservationStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

@Schema({ _id: false })
export class AbcBehaviourObservationEntry {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  data?: string;
}

export const AbcBehaviourObservationEntrySchema =
  SchemaFactory.createForClass(AbcBehaviourObservationEntry);

@Schema({ timestamps: true, collection: 'abcbehaviourobservations' })
export class AbcBehaviourObservation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  children!: Types.ObjectId;

  @Prop({ type: Date })
  date?: Date;

  @Prop({
    type: [AbcBehaviourObservationEntrySchema],
    default: [],
  })
  observationEntries?: AbcBehaviourObservationEntry[];

  @Prop({ type: String })
  shortTermGoal?: string;

  @Prop({ type: String })
  longTermGoal?: string;

  @Prop({ type: String })
  behaviourRequirements?: string;

  @Prop({ type: String })
  issuesSituations?: string;

  @Prop({ type: String })
  riskMitigation?: string;

  @Prop({ type: String })
  resources?: string;

  @Prop({ type: String })
  timeFrame?: string;

  @Prop({ type: String })
  strategies?: string;

  @Prop({ type: String })
  evaluation?: string;

  @Prop({ type: String })
  commentsAdditionalActionItems?: string;

  @Prop({ type: Boolean, default: false })
  allowComments?: boolean;

  @Prop({ type: Boolean, default: false })
  allowTrackbacks?: boolean;

  @Prop({
    type: String,
    enum: Object.values(AbcBehaviourObservationStatus),
    default: AbcBehaviourObservationStatus.DRAFT,
  })
  status!: AbcBehaviourObservationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const AbcBehaviourObservationSchema =
  SchemaFactory.createForClass(AbcBehaviourObservation);


