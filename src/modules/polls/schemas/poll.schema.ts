import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PollDocument = HydratedDocument<Poll>;

@Schema()
class PollChoice {
  @Prop({ required: true, trim: true })
  label!: string;

  // aggregated count, updated atomically
  @Prop({ type: Number, default: 0 })
  count!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  _id!: Types.ObjectId;
}
const PollChoiceSchema = SchemaFactory.createForClass(PollChoice);

@Schema()
class PollQuestion {
  @Prop({ required: true, trim: true })
  text!: string;

  @Prop({ type: [PollChoiceSchema], default: [] })
  choices!: PollChoice[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  _id!: Types.ObjectId;
}
const PollQuestionSchema = SchemaFactory.createForClass(PollQuestion);

@Schema({ timestamps: true, collection: 'polls' })
export class Poll {
  @Prop({ required: true, trim: true })
  title!: string; // "Polling About"

  // when true, ignore campuses array for targeting
  @Prop({ type: Boolean, default: false })
  isForAllCampuses!: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Campus', default: [] })
  campuses!: Types.ObjectId[];

  @Prop({ type: Date, default: Date.now })
  pollDate!: Date;

  @Prop({ type: Boolean, default: false })
  isMultipleSelect!: boolean;

  @Prop({ type: Boolean, default: false })
  isCommentEnabled!: boolean;

  @Prop({ type: [PollQuestionSchema], default: [] })
  questions!: PollQuestion[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: String, enum: ['draft', 'active', 'archived'], default: 'active' })
  status!: 'draft' | 'active' | 'archived';

  // soft delete guard rail
  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

// Suggested indexes
PollSchema.index({ isForAllCampuses: 1, status: 1 });
PollSchema.index({ campuses: 1, status: 1 });
PollSchema.index({ title: 'text', 'questions.text': 'text', 'questions.choices.label': 'text' });

