import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ResponseStatus {
  GOING = 'going',
  NOT_GOING = 'not_going',
  MAYBE = 'maybe',
  NO_ANSWER = 'no_answer',
}

@Schema({ timestamps: true, collection: 'event_responses' })
export class EventResponse extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  parentId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ResponseStatus), default: ResponseStatus.NO_ANSWER })
  status: ResponseStatus;

  @Prop({ type: Number, default: 0 })
  quantity: number;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export type EventResponseDocument = EventResponse & Document;

export const EventResponseSchema = SchemaFactory.createForClass(EventResponse);

// Ensure a single response per parent per event
EventResponseSchema.index(
  { eventId: 1, parentId: 1 },
  { unique: true, sparse: false, name: 'uniq_parent_event_response' },
);

// Useful query patterns
EventResponseSchema.index({ eventId: 1, createdAt: -1 });


