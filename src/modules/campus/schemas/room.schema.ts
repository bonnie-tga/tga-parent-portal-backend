import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum RoomStatus {
  DRAFT = 'Draft',
  PUBLISH = 'Publish'
}

@Schema({ timestamps: true })
export class Room extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ['Infant', 'Not Infant', 'Toddler', 'Preschool', 'Kindergarten'], required: false })
  category: string;

  @Prop({ type: String, enum: ['0-2', '2-3', '3-5'], required: false })
  age: string;

  @Prop({ type: String, enum: ['Indoor', 'Outdoor', 'Common Area'], required: false })
  type: string;

  @Prop({ type: Boolean, default: false })
  displayOnFrontend: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
  
  @Prop({ type: String, enum: Object.values(RoomStatus), default: RoomStatus.DRAFT })
  status: string;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
