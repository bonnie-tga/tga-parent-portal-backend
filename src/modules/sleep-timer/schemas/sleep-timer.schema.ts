import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum sleepTimerStatus {
  SLEEPING = 'sleeping',
  AWAKE = 'awake',
}

@Schema({ timestamps: true })
export class SleepTimer extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId, ref: 'Child', required: true
  })
  child: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CotRoom', required: true })
  cotRoom: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: false })
  startSleepTime?: Date;

  @Prop({ type: Date, required: false })
  endSleepTime?: Date;

  @Prop({ type: String, enum: Object.values(sleepTimerStatus), required: false })
  status?: sleepTimerStatus;

  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: [Date], default: [] })
  cotCheckTimes?: Date[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;
}

export const SleepTimerSchema = SchemaFactory.createForClass(SleepTimer);
