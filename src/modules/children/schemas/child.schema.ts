import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Child extends Document {
  @Prop({ required: true })
  fullName: string;

  @Prop()
  dateOfBirth: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
  campus: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  room: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  parents: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({
    type: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        days: { type: [String], default: [] },
      },
    ],
    default: [],
  })
  attendance: {
    from: string;
    to: string;
    days: string[];
  }[];

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: Boolean, default: false })
  toiletTraining: boolean;

  @Prop({ type: Boolean, default: false })
  noConcent: boolean;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop()
  profileImage: string;

  @Prop({ type: String })
  specialRequirements: string;

  @Prop({ type: Boolean, default: false })
  updateMedical: boolean;
}

export const ChildSchema = SchemaFactory.createForClass(Child);
