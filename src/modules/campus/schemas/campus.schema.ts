import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum CampusStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PUBLISH = 'Publish'
}

@Schema({ timestamps: true })
export class Campus extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  campusDirector: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isOpen: boolean;

  @Prop({ type: Date, required: false })
  vipOrientationDate: Date;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Room' }], default: [] })
  rooms: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
  
  @Prop({ type: String, enum: CampusStatus, default: CampusStatus.DRAFT })
  status: CampusStatus;

  @Prop()
  googleReview: string;
}

export const CampusSchema = SchemaFactory.createForClass(Campus);
