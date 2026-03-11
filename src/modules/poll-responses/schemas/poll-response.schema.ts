import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PollResponseDocument = HydratedDocument<PollResponse>;

@Schema({ timestamps: true, collection: 'poll_responses' })
export class PollResponse {
  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true })
  pollId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campusId!: Types.ObjectId;

  // optional: parent picks which child they're voting under
  @Prop({ type: Types.ObjectId, ref: 'Child' })
  childId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  questionId!: Types.ObjectId;

  // selected choice IDs (one or many depending on poll.isMultipleSelect)
  @Prop({ type: [Types.ObjectId], required: true })
  selectedChoiceIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true })
  comment?: string;

  // idempotency key if you want to guarantee one write per client attempt
  @Prop({ type: String })
  requestIdempotencyKey?: string;
}

export const PollResponseSchema =
  SchemaFactory.createForClass(PollResponse);

// Prevent double voting per user per question
PollResponseSchema.index(
  { pollId: 1, questionId: 1, userId: 1 },
  {
    unique: true,
    sparse: false,
    name: 'uniq_user_vote_per_question',
  },
);

// Useful filters
PollResponseSchema.index({ pollId: 1, campusId: 1, createdAt: -1 });
PollResponseSchema.index({ userId: 1, pollId: 1 });

