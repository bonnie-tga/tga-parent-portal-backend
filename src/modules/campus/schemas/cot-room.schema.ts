import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Campus } from './campus.schema';
import { Room } from './room.schema';
import { User } from '../../users/schemas/user.schema';

export enum CotRoomStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PUBLISHED = 'Publish'
}

@Schema({ timestamps: true })
export class CotRoom extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus' })
  campus: Campus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room' })
  room: Room;

  @Prop({ 
    type: String, 
    enum: Object.values(CotRoomStatus),
    default: CotRoomStatus.DRAFT 
  })
  status: CotRoomStatus;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: User;
}

export const CotRoomSchema = SchemaFactory.createForClass(CotRoom);
