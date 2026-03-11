import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { getLocalTimestamp } from '../../../common/utils/timezone.util';

export enum NappyCategory {
    SOILED = 'soiled',
    WET = 'wet',
    DRY = 'dry',
    CREAM = 'cream',
    SUNSCREEN_APPLIED = 'sunscreen_applied',
    LATE_LEFT_EARLY = 'late_left_early',
    ASLEEP = 'asleep',
    REST_TIME_NAPPY = 'rest_time_nappy'
}

@Schema({ _id: false })
class NappyTimeSlot {
    @Prop({ type: String, required: false })
    time?: string; // e.g., "7:30 AM"

    @Prop({ type: [String], enum: Object.values(NappyCategory), required: false })
    categories?: NappyCategory[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
    staff?: MongooseSchema.Types.ObjectId;

    @Prop({ required: false, default: '' })
    doneTime?: string; // e.g., "7:30 AM"
}

@Schema({ _id: false })
class NappyChildEntry {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Child', required: false })
    child?: MongooseSchema.Types.ObjectId;

    @Prop({ type: [NappyTimeSlot], default: [] })
    slots?: NappyTimeSlot[];

    @Prop({ required: false, default: '' })
    specialRequirements?: string;
}

@Schema({ timestamps: true })
export class NappyChange extends Document {
    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Campus', required: true })
    campus: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: false })
    room?: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    author: MongooseSchema.Types.ObjectId;

    @Prop({ type: [NappyChildEntry], default: [] })
    nappyChildEntries?: NappyChildEntry[];

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;
}

export const NappyChangeSchema = SchemaFactory.createForClass(NappyChange);

NappyChangeSchema.pre('save', function (next) {
  const now = getLocalTimestamp();
  if (this.isNew) {
    this.set('createdAt', now);
  }
  this.set('updatedAt', now);
  next();
});

NappyChangeSchema.pre('findOneAndUpdate', function (next) {
  this.set('updatedAt', getLocalTimestamp());
  next();
});


