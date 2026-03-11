import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { getLocalTimestamp } from '../../../common/utils/timezone.util';

export type WellbeingDocument = HydratedDocument<Wellbeing>;

@Schema({ timestamps: true, collection: 'wellbeing' })
export class Wellbeing {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Child' })
  childId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['sleep-timer', 'daily-chart', 'nappy-change', 'toilet-training'],
    required: true,
  })
  type!:
    | 'sleep-timer'
    | 'daily-chart'
    | 'nappy-change'
    | 'toilet-training';

  @Prop({
    type: Types.ObjectId,
    required: true,
    refPath: 'refModel',
  })
  refId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['SleepTimer', 'DailyChart', 'NappyChange', 'ToiletTraining'],
    required: true,
  })
  refModel!: string;

  @Prop({ type: [Types.ObjectId], ref: 'Campus', default: [] })
  campuses!: Types.ObjectId[];
  
  // Summary for rendering in the latest cards
  @Prop({ type: Object })
  payload?: any;
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const WellbeingSchema = SchemaFactory.createForClass(Wellbeing);

WellbeingSchema.pre('save', function (next) {
  const now = getLocalTimestamp();
  if (this.isNew) {
    this.set('createdAt', now);
  }
  this.set('updatedAt', now);
  next();
});

WellbeingSchema.pre('findOneAndUpdate', function (next) {
  this.set('updatedAt', getLocalTimestamp());
  next();
});

// Indexes
WellbeingSchema.index({ childId: 1, type: 1, updatedAt: -1 });
WellbeingSchema.index({ campuses: 1, type: 1, updatedAt: -1 });
WellbeingSchema.index({ createdBy: 1, updatedAt: -1 });
WellbeingSchema.index({ isDeleted: 1, updatedAt: -1 });
WellbeingSchema.index({ updatedAt: -1 });
