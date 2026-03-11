import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WellnessPlanStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
}

export enum WellnessPlanGroup {
  UNDER_4_MONTHS = 'Under 4 Months',
  FOUR_TO_EIGHT_MONTHS = '4 - 8 Months',
  EIGHT_TO_TWELVE_MONTHS = '8 - 12 Months',
  ONE_TO_TWO_YEARS = '1 - 2 Years',
  TWO_TO_THREE_YEARS = '2 - 3 Years',
  THREE_TO_FIVE_YEARS = '3 - 5 Years',
  SCHOOL_LEAVERS = 'School Leavers',
}

@Schema({ _id: false })
export class WellnessPlanInitialPlan {
  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String, enum: ['Outdoor', 'Indoor'] })
  outdoorIndoor?: string;

  @Prop({ type: Object })
  groveTheory?: {
    groveBody?: boolean;
    groveMind?: boolean;
    groveHeart?: boolean;
    groveCompass?: boolean;
    groveExpression?: boolean;
  };

  @Prop({ type: String })
  initialPlanPossibility?: string;

  @Prop({ type: String })
  intentionalTeaching?: string;
}

export const WellnessPlanInitialPlanSchema =
  SchemaFactory.createForClass(WellnessPlanInitialPlan);

@Schema({ timestamps: true, collection: 'wellnessplans' })
export class WellnessPlan extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campus', required: true })
  campus!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  room!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true })
  children!: Types.ObjectId;

  @Prop({ type: Date })
  date?: Date;

  @Prop({ type: String })
  childStrengthsObservedAtHome?: string;

  @Prop({ type: String })
  childCurrentInterests?: string;

  @Prop({ type: [String], default: [] })
  childDesiredSkillDevelopment?: string[];

  @Prop({
    type: String,
    enum: Object.values(WellnessPlanGroup),
  })
  group?: WellnessPlanGroup;

  @Prop({
    type: [WellnessPlanInitialPlanSchema],
    default: [],
  })
  initialPlans?: WellnessPlanInitialPlan[];

  @Prop({ type: Object })
  milestoneResponses?: Record<string, Record<string, 'yes' | 'no' | 'wt' | ''>>;

  @Prop({ type: [String], default: [] })
  attachments?: string[];

  @Prop({ type: Boolean, default: true })
  allowComments?: boolean;

  @Prop({ type: Boolean, default: false })
  allowTrackbacks?: boolean;

  @Prop({ type: Boolean, default: false })
  midYearParentTeacherMeetings?: boolean;

  @Prop({ type: String })
  midYearParentTeacherMeetingsComment?: string;

  @Prop({ type: String })
  schoolLeaversExtendedComment?: string;

  @Prop({ type: [String], default: [] })
  schoolLeaversAttachments?: string[];

  @Prop({
    type: String,
    enum: Object.values(WellnessPlanStatus),
    default: WellnessPlanStatus.DRAFT,
  })
  status!: WellnessPlanStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Number, default: 0 })
  likeCount?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedByParents?: Types.ObjectId[];
}

export const WellnessPlanSchema = SchemaFactory.createForClass(WellnessPlan);


