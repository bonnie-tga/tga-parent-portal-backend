import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum CotRoomCheckStatus {
 YES = 'Yes',
 NO = 'No',
 N_A = 'N/A'
}

export class CotRoomCheckOption {
  @Prop({ type: String, enum: Object.values(CotRoomCheckStatus), required: false })
  status?: CotRoomCheckStatus;

  @Prop({ type: String, required: false })
  label?: string;

  @Prop({ type: String, required: false })
  value?: string;
}

@Schema({ timestamps: true })
export class CotRoomCheck extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CotRoom', required: true })
  cotRoom: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  staff: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: false })
  date?: Date;

  @Prop({ type: Date, required: false })
  time?: Date;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Child' }], default: [] })
  sleepingChildren?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [CotRoomCheckOption], required: false })
  cotRoomCheckOptions?: CotRoomCheckOption[];

  @Prop({ type: Boolean, required: false, default: false })
  reChecked?: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;
}

export const CotRoomCheckSchema = SchemaFactory.createForClass(CotRoomCheck);
