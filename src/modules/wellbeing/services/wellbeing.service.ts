import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wellbeing, WellbeingDocument } from '../schemas/wellbeing.schema';
import { User } from '../../users/schemas/user.schema';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { QueryWellbeingDto } from '../dto/query-wellbeing.dto';

const TYPE_TO_MODEL_MAP = {
  'sleep-timer': 'SleepTimer',
  'daily-chart': 'DailyChart',
  'nappy-change': 'NappyChange',
  'toilet-training': 'ToiletTraining',
} as const;

type WellbeingType = keyof typeof TYPE_TO_MODEL_MAP;

interface ActivityResult {
  type: string;
  id: Types.ObjectId;
  child: any;
  payload: any;
  createdAt: Date;
  refId: any;
}

interface ActivityData {
  id: Types.ObjectId;
  payload: any;
  createdAt: Date;
  refId: any;
}

interface ChildActivities {
  child: {
    _id: Types.ObjectId;
    fullName: string;
  };
  activities: {
    [type: string]: ActivityData;
  };
}

type ActivitiesResponse = ChildActivities[];

@Injectable()
export class WellbeingService {
  private readonly logger = new Logger(WellbeingService.name);

  constructor(
    @InjectModel(Wellbeing.name) private readonly wellbeingModel: Model<WellbeingDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(
    type: WellbeingType,
    refId: string,
    childId: string,
    payload?: Record<string, any>,
    createdBy?: string,
    campuses: string[] = [],
    notes?: string,
  ): Promise<WellbeingDocument> {
    if (!Types.ObjectId.isValid(refId)) {
      throw new BadRequestException('Invalid refId format');
    }
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid childId format');
    }
    if (createdBy && !Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid createdBy format');
    }

    try {
      const wellbeingEvent = new this.wellbeingModel({
        childId: new Types.ObjectId(childId),
        type,
        refId: new Types.ObjectId(refId),
        refModel: TYPE_TO_MODEL_MAP[type],
        campuses: campuses.map((id) => {
          if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid campus ID format: ${id}`);
          }
          return new Types.ObjectId(id);
        }),
        payload,
        createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
        notes,
      });

      const saved = await wellbeingEvent.save();
      this.logger.log(`Wellbeing activity created: ${type} for child ${childId}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create wellbeing activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(currentUser: User, queryDto?: QueryWellbeingDto): Promise<ActivitiesResponse | any> {
    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      const baseMatch = this.buildBaseMatch(accessFilter, queryDto);

      // Check if page/limit are explicitly provided (not just default values)
      const hasExplicitPagination = queryDto?.page !== undefined || queryDto?.limit !== undefined;

      if (queryDto?.date && (queryDto?.type || hasExplicitPagination)) {
        return this.findActivitiesByDatePaginated(baseMatch, queryDto);
      }

      if (queryDto?.date) {
        return this.findActivitiesByDate(baseMatch);
      }

      if (queryDto?.type || hasExplicitPagination) {
        return this.findActivitiesByTypePaginated(baseMatch, queryDto);
      }

      return this.findLatestActivitiesByChild(baseMatch, accessFilter, queryDto);
    } catch (error) {
      this.logger.error(`Failed to find wellbeing activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string, currentUser?: User): Promise<WellbeingDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellbeing ID format');
    }

    try {
      const wellbeing = await this.wellbeingModel
        .findById(id)
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .exec();

      if (!wellbeing) {
        throw new NotFoundException('Wellbeing activity not found');
      }

      if (currentUser && !this.hasAccessToWellbeingRecord(wellbeing, currentUser)) {
        throw new ForbiddenException('Access denied to this wellbeing record');
      }

      return wellbeing;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to find wellbeing activity ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByRefId(refId: string, type: string): Promise<WellbeingDocument[]> {
    if (!Types.ObjectId.isValid(refId)) {
      throw new BadRequestException('Invalid refId format');
    }

    try {
      return this.wellbeingModel
        .find({
          refId: new Types.ObjectId(refId),
          type,
          isDeleted: false,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find wellbeing by refId ${refId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByRefIdAndChild(refId: string, childId: string, type: string): Promise<WellbeingDocument | null> {
    if (!Types.ObjectId.isValid(refId)) {
      throw new BadRequestException('Invalid refId format');
    }
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid childId format');
    }

    try {
      return this.wellbeingModel
        .findOne({
          refId: new Types.ObjectId(refId),
          type,
          childId: new Types.ObjectId(childId),
          isDeleted: false,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find wellbeing by refId ${refId} and child ${childId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByRefIdAndChildAndCategory(
    refId: string,
    childId: string,
    type: string,
    category: string,
  ): Promise<WellbeingDocument | null> {
    if (!Types.ObjectId.isValid(refId)) {
      throw new BadRequestException('Invalid refId format');
    }
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid childId format');
    }

    try {
      return this.wellbeingModel
        .findOne({
          refId: new Types.ObjectId(refId),
          type,
          childId: new Types.ObjectId(childId),
          'payload.category': category,
          isDeleted: false,
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to find wellbeing by refId ${refId}, child ${childId}, and category ${category}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: string, payload?: Record<string, any>, notes?: string): Promise<WellbeingDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellbeing ID format');
    }

    try {
      const existing = await this.wellbeingModel.findById(id);
      if (!existing) {
        throw new NotFoundException('Wellbeing activity not found');
      }

      if (payload !== undefined) {
        existing.payload = payload;
      }
      if (notes !== undefined) {
        existing.notes = notes;
      }

      const updated = await existing.save();
      this.logger.log(`Wellbeing activity updated: ${id}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update wellbeing activity ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<WellbeingDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellbeing ID format');
    }

    try {
      const removed = await this.wellbeingModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
      if (!removed) {
        throw new NotFoundException('Wellbeing activity not found');
      }
      this.logger.log(`Wellbeing activity soft deleted: ${id}`);
      return removed;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to remove wellbeing activity ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCalendar(currentUser: User, month?: string, type?: string): Promise<{
    month: string;
    activeDates: string[];
    activitiesByDate: Record<string, string[]>;
    timeline: any[];
    totalActivities: number;
  }> {
    try {
      const currentMonth = month || new Date().toISOString().slice(0, 7);
      const startDate = new Date(`${currentMonth}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      const accessFilter = this.buildAccessFilter(currentUser);

      const query: Record<string, any> = {
        ...accessFilter,
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      };

      if (type) {
        query.type = type;
      }

      const activities = await this.wellbeingModel
        .find(query)
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const activeDates = [...new Set(activities.map((a: any) => (a.createdAt as Date).toISOString().split('T')[0]))].sort();
      const activitiesByDate: Record<string, string[]> = {};

      activities.forEach((activity: any) => {
        const date = (activity.createdAt as Date).toISOString().split('T')[0];
        if (!activitiesByDate[date]) {
          activitiesByDate[date] = [];
        }
        if (!activitiesByDate[date].includes(activity.type)) {
          activitiesByDate[date].push(activity.type);
        }
      });

      const timeline: any[] = [];
      
      activities.forEach((activity: any) => {
        const date = (activity.createdAt as Date).toISOString().split('T')[0];
        const childId = activity.childId?._id?.toString() || activity.childId?.toString();
        const childName = activity.childId?.fullName || null;

        if (activity.type === 'nappy-change' && activity.payload?.slots?.length) {
          activity.payload.slots.forEach((slot: any) => {
            const time = slot.time && slot.time.trim() ? slot.time : '';
            const doneTime = slot.doneTime && slot.doneTime.trim() ? slot.doneTime : '';
            
            timeline.push({
              id: activity._id.toString(),
              type: activity.type,
              date,
              time: time,
              doneTime: doneTime,
              childId,
              childName,
            });
          });
        } else if (activity.type === 'toilet-training' && activity.payload?.slots?.length) {
          activity.payload.slots.forEach((slot: any) => {
            const doneTime = slot.doneTime && slot.doneTime.trim() ? slot.doneTime : '';
            
            timeline.push({
              id: activity._id.toString(),
              type: activity.type,
              date,
              time: doneTime,
              childId,
              childName,
            });
          });
        } else if (activity.type === 'sleep-timer' && activity.payload) {
          const formatTimeTo12Hour = (isoTime: string): string => {
            if (!isoTime) return '';
            const date = new Date(isoTime);
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            return `${displayHours}:${displayMinutes} ${period}`;
          };

          const startTime = activity.payload.startSleepTime 
            ? formatTimeTo12Hour(activity.payload.startSleepTime)
            : '';
          const endTime = activity.payload.endSleepTime 
            ? formatTimeTo12Hour(activity.payload.endSleepTime)
            : '';
          
          timeline.push({
            id: activity._id.toString(),
            type: activity.type,
            date,
            time: startTime,
            endTime: endTime,
            childId,
            childName,
          });
        } else if (activity.type === 'daily-chart' && activity.payload) {
          const time = activity.payload.time && activity.payload.time.trim() ? activity.payload.time : '';
          
          timeline.push({
            id: activity._id.toString(),
            type: activity.type,
            date,
            time: time,
            childId,
            childName,
          });
        } else {
          const time = (activity.createdAt as Date).toISOString().split('T')[1]?.split('.')[0] || '';
          timeline.push({
            id: activity._id.toString(),
            type: activity.type,
            date,
            time,
            childId,
            childName,
          });
        }
      });

      return {
        month: currentMonth,
        activeDates,
        activitiesByDate,
        timeline,
        totalActivities: activities.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get calendar for user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTimeline(currentUser: User, startDate?: string, endDate?: string, limit: number = 20): Promise<WellbeingDocument[]> {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      const query: Record<string, any> = { ...accessFilter, isDeleted: false };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          if (isNaN(start.getTime())) {
            throw new BadRequestException('Invalid startDate format');
          }
          query.createdAt.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (isNaN(end.getTime())) {
            throw new BadRequestException('Invalid endDate format');
          }
          query.createdAt.$lte = end;
        }
      }

      return this.wellbeingModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get timeline: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActivitiesByDate(currentUser: User, date: string): Promise<WellbeingDocument[]> {
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    try {
      const accessFilter = this.buildAccessFilter(currentUser);

      return this.wellbeingModel
        .find({
          ...accessFilter,
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get activities by date ${date}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActivitiesByChildIdAndDate(
    currentUser: User,
    childId: string,
    date?: string,
    type?: string,
  ): Promise<WellbeingDocument[]> {
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid childId format');
    }

    // If date is not provided, use current date in local timezone
    let targetDate: string;
    if (date) {
      targetDate = date;
    } else {
      // Get current date in local timezone (YYYY-MM-DD format)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      targetDate = `${year}-${month}-${day}`;
    }

    // Create date range for the entire day in UTC
    // Start of day: 00:00:00 UTC
    // End of day: 23:59:59.999 UTC
    const startDate = new Date(`${targetDate}T00:00:00.000Z`);
    const endDate = new Date(`${targetDate}T23:59:59.999Z`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      const childObjectId = new Types.ObjectId(childId);

      // Check if user has access to this child
      if (accessFilter.childId?.$in) {
        const allowedChildIds = accessFilter.childId.$in.map((id: any) => id.toString());
        if (!allowedChildIds.includes(childId)) {
          this.logger.warn(`User ${currentUser._id} does not have access to child ${childId}`);
          return [];
        }
      }

      // Build query - override childId from accessFilter with the specific childId
      const { childId: _, ...restAccessFilter } = accessFilter;
      const query: Record<string, any> = {
        ...restAccessFilter,
        childId: childObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      };

      // Add type filter if provided
      if (type) {
        if (!['nappy-change', 'toilet-training', 'sleep-timer', 'daily-chart'].includes(type)) {
          throw new BadRequestException('Invalid type. Must be one of: nappy-change, toilet-training, sleep-timer, daily-chart');
        }
        query.type = type;
      }

      this.logger.log(
        `Querying activities for child ${childId} on ${targetDate}${date ? '' : ' (default: current date)'}${type ? ` with type ${type}` : ''} (${startDate.toISOString()} to ${endDate.toISOString()})`,
      );
      this.logger.debug(`Query: ${JSON.stringify(query, null, 2)}`);

      // First check if there are any activities for this child at all (for debugging)
      const totalCount = await this.wellbeingModel.countDocuments({
        ...restAccessFilter,
        childId: childObjectId,
        isDeleted: false,
      });
      this.logger.debug(`Total activities for child ${childId} (all dates): ${totalCount}`);

      const activities = await this.wellbeingModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .lean()
        .exec();

      // Populate staff in payload and sort slots for nappy-change and toilet-training activities
      const populatedActivities = await Promise.all(
        activities.map(async (activity: any) => {
          if ((activity.type === 'nappy-change' || activity.type === 'toilet-training') && activity.payload?.slots) {
            // Populate staff for both nappy-change and toilet-training activities
            activity.payload = await this.populateStaffInPayload(activity.payload);
            
            // Sort slots: incomplete slots (no doneTime) first, then by doneTime descending (most recent first)
            if (Array.isArray(activity.payload.slots)) {
              activity.payload.slots.sort((a: any, b: any) => {
                const aDoneTime = a.doneTime && a.doneTime.trim() ? a.doneTime : null;
                const bDoneTime = b.doneTime && b.doneTime.trim() ? b.doneTime : null;
                
                // Incomplete slots (no doneTime) come first
                if (!aDoneTime && bDoneTime) return -1;
                if (aDoneTime && !bDoneTime) return 1;
                
                // Both have doneTime - sort by doneTime descending (most recent first)
                if (aDoneTime && bDoneTime) {
                  const aTime = this.parseTimeToMinutes(aDoneTime);
                  const bTime = this.parseTimeToMinutes(bDoneTime);
                  return bTime - aTime; // Descending order (most recent first)
                }
                
                // Both incomplete - maintain original order
                return 0;
              });
            }
          }
          return activity;
        }),
      );

      if (populatedActivities.length === 0 && !date) {
        // If no results for current date, log recent activities for debugging
        const recentActivities = await this.wellbeingModel
          .find({
            ...restAccessFilter,
            childId: childObjectId,
            isDeleted: false,
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('createdAt type')
          .lean()
          .exec();
        
        if (recentActivities.length > 0) {
          const recentDates = recentActivities.map((a: any) => 
            new Date(a.createdAt).toISOString().split('T')[0]
          );
          this.logger.warn(
            `No activities found for child ${childId} on ${targetDate}. Recent activity dates: ${recentDates.join(', ')}`,
          );
        }
      }

      this.logger.log(
        `Retrieved ${populatedActivities.length} activities for child ${childId} on ${targetDate} (out of ${totalCount} total)`,
      );
      return populatedActivities;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to get activities for child ${childId} on ${targetDate}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async findActivitiesByDate(baseMatch: Record<string, any>): Promise<ActivitiesResponse> {
    try {
      // Build match stage for aggregation - ensure all filters are preserved
      const matchStage: Record<string, any> = {};
      
      // Copy all baseMatch fields
      Object.keys(baseMatch).forEach((key) => {
        if (key === 'childId' && baseMatch.childId) {
          if (baseMatch.childId instanceof Types.ObjectId) {
            matchStage.childId = baseMatch.childId;
          } else if (baseMatch.childId.$in) {
            matchStage.childId = { $in: baseMatch.childId.$in };
          } else {
            matchStage.childId = baseMatch.childId;
          }
        } else if (key === 'campuses' && baseMatch.campuses) {
          if (baseMatch.campuses instanceof Types.ObjectId) {
            matchStage.campuses = baseMatch.campuses;
          } else if (baseMatch.campuses.$in) {
            matchStage.campuses = { $in: baseMatch.campuses.$in };
          } else {
            matchStage.campuses = baseMatch.campuses;
          }
        } else if (key === 'createdBy' && baseMatch.createdBy) {
          if (baseMatch.createdBy instanceof Types.ObjectId) {
            matchStage.createdBy = baseMatch.createdBy;
          } else {
            matchStage.createdBy = baseMatch.createdBy;
          }
        } else {
          // Copy other fields as-is (including createdAt date filter)
          matchStage[key] = baseMatch[key];
        }
      });

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const matchStageWithFilter = {
        ...matchStage,
        $or: [
          { type: { $ne: 'daily-chart' } },
          { 'payload.category': { $exists: true, $ne: null } },
        ],
      };

      const childrenWithLatestActivity = await this.wellbeingModel.aggregate([
        { $match: matchStageWithFilter },
        { $sort: { updatedAt: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$childId',
            latestActivityTime: { $max: '$updatedAt' },
            latestActivityCreatedAt: { $first: '$createdAt' },
          },
        },
        { $sort: { latestActivityTime: -1, latestActivityCreatedAt: -1 } },
      ]);


      if (childrenWithLatestActivity.length === 0) return [];

      const childIds = childrenWithLatestActivity
        .map((item) => item._id)
        .filter((id) => id != null && Types.ObjectId.isValid(id))
        .map((id) => (id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id))));

      if (childIds.length === 0) return [];

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const allActivitiesMatch = {
        ...matchStageWithFilter,
        childId: { $in: childIds },
      };

      const allActivities = await this.wellbeingModel.aggregate([
        {
          $match: allActivitiesMatch,
        },
        { $sort: { updatedAt: -1, createdAt: -1 } },
        {
          $group: {
            _id: { childId: '$childId', type: '$type' },
            latestActivity: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$latestActivity' } },
      ]);

      const populatedActivities = await this.populateActivitiesForChildren(allActivities);

      const childMap = new Map<string, ChildActivities>();

      populatedActivities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        // Handle populated childId object
        let childIdValue: Types.ObjectId | null = null;
        if (activity.childId instanceof Types.ObjectId) {
          childIdValue = activity.childId;
        } else if (activity.childId?._id) {
          // Populated object case
          const id = activity.childId._id instanceof Types.ObjectId 
            ? activity.childId._id 
            : new Types.ObjectId(String(activity.childId._id));
          childIdValue = id;
        } else if (Types.ObjectId.isValid(String(activity.childId))) {
          childIdValue = new Types.ObjectId(String(activity.childId));
        }

        if (!childIdValue) return;

        const childIdStr = childIdValue.toString();

        if (!childMap.has(childIdStr)) {
          childMap.set(childIdStr, {
            child: {
              _id: childIdValue,
              fullName: activity.child?.fullName || '',
            },
            activities: {},
          });
        }

        const childData = childMap.get(childIdStr)!;
        const transformedPayload = this.transformActivityPayload(activity.type, activity.payload);
        childData.activities[activity.type] = {
          id: activity._id,
          payload: transformedPayload,
          createdAt: activity.createdAt,
          refId: activity.refId,
        };
      });

      const result: ActivitiesResponse = [];
      childIds.forEach((childId) => {
        const childIdStr = childId instanceof Types.ObjectId ? childId.toString() : 
          (Types.ObjectId.isValid(String(childId)) ? String(childId) : null);
        if (!childIdStr) return;
        const childData = childMap.get(childIdStr);
        if (childData) {
          result.push(childData);
        }
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to find activities by date: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async findActivitiesByDatePaginated(
    baseMatch: Record<string, any>,
    queryDto: QueryWellbeingDto,
  ): Promise<{ data: WellbeingDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 10;
      const skip = (page - 1) * limit;

      const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
      const sortField = queryDto.sortBy || 'createdAt';
      const sort: Record<string, any> = { [sortField]: sortOrder };

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const baseMatchWithFilter = {
        ...baseMatch,
        $or: [
          { type: { $ne: 'daily-chart' } },
          { 'payload.category': { $exists: true, $ne: null } },
        ],
      };

      const total = await this.wellbeingModel.countDocuments(baseMatchWithFilter);

      const activities = await this.wellbeingModel
        .find(baseMatchWithFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .populate('campuses', 'name')
        .lean()
        .exec();

      const populatedActivities = await Promise.all(
        activities.map(async (activity: any) => {
          if ((activity.type === 'nappy-change' || activity.type === 'toilet-training') && activity.payload?.slots) {
            activity.payload = await this.populateStaffInPayload(activity.payload);
          }
          activity.payload = this.transformActivityPayload(activity.type, activity.payload);
          return activity;
        }),
      );

      const totalPages = Math.ceil(total / limit);

      return {
        data: populatedActivities,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to find activities by date with pagination: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async findActivitiesByTypePaginated(
    baseMatch: Record<string, any>,
    queryDto: QueryWellbeingDto,
  ): Promise<{ data: WellbeingDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 10;
      const skip = (page - 1) * limit;

      const sortOrder = queryDto.sortOrder === 'asc' ? 1 : -1;
      const sortField = queryDto.sortBy || 'createdAt';
      const sort: Record<string, any> = { [sortField]: sortOrder };

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const baseMatchWithFilter = {
        ...baseMatch,
        $or: [
          { type: { $ne: 'daily-chart' } },
          { 'payload.category': { $exists: true, $ne: null } },
        ],
      };

      const total = await this.wellbeingModel.countDocuments(baseMatchWithFilter);

      const activities = await this.wellbeingModel
        .find(baseMatchWithFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('refId')
        .populate('childId', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .populate('campuses', 'name')
        .lean()
        .exec();

      const populatedActivities = await Promise.all(
        activities.map(async (activity: any) => {
          if ((activity.type === 'nappy-change' || activity.type === 'toilet-training') && activity.payload?.slots) {
            activity.payload = await this.populateStaffInPayload(activity.payload);
          }
          activity.payload = this.transformActivityPayload(activity.type, activity.payload);
          return activity;
        }),
      );

      const totalPages = Math.ceil(total / limit);

      return {
        data: populatedActivities,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to find activities by type: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async findLatestActivitiesByChild(
    baseMatch: Record<string, any>,
    accessFilter: Record<string, any>,
    queryDto?: QueryWellbeingDto,
  ): Promise<ActivitiesResponse> {
    try {
      const childMatch: Record<string, any> = {
        ...accessFilter,
        isDeleted: false,
      };

      if (queryDto?.type) childMatch.type = queryDto.type;
      if (queryDto?.campusId) {
        if (!Types.ObjectId.isValid(queryDto.campusId)) {
          throw new BadRequestException('Invalid campusId format');
        }
        childMatch.campuses = new Types.ObjectId(queryDto.campusId);
      }
      if (queryDto?.createdBy) {
        if (!Types.ObjectId.isValid(queryDto.createdBy)) {
          throw new BadRequestException('Invalid createdBy format');
        }
        childMatch.createdBy = new Types.ObjectId(queryDto.createdBy);
      }

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const childMatchWithFilter = {
        ...childMatch,
        $or: [
          { type: { $ne: 'daily-chart' } },
          { 'payload.category': { $exists: true, $ne: null } },
        ],
      };

      const childrenWithLatestActivity = await this.wellbeingModel.aggregate([
        { $match: childMatchWithFilter },
        { $sort: { updatedAt: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$childId',
            latestActivityTime: { $max: '$updatedAt' },
            latestActivityCreatedAt: { $first: '$createdAt' },
          },
        },
        { $sort: { latestActivityTime: -1, latestActivityCreatedAt: -1 } },
      ]);

      if (childrenWithLatestActivity.length === 0) return [];

      const childIds = childrenWithLatestActivity
        .map((item) => item._id)
        .filter((id) => id != null && Types.ObjectId.isValid(id))
        .map((id) => (id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id))));

      if (childIds.length === 0) return [];

      // Exclude childrenBottles entries (daily-chart entries with no category)
      const allActivitiesMatch = {
        ...childMatchWithFilter,
        childId: { $in: childIds },
      };

      const allActivities = await this.wellbeingModel.aggregate([
        {
          $match: allActivitiesMatch,
        },
        { $sort: { updatedAt: -1, createdAt: -1 } },
        {
          $group: {
            _id: { childId: '$childId', type: '$type' },
            latestActivity: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$latestActivity' } },
      ]);

      const populatedActivities = await this.populateActivitiesForChildren(allActivities);

      const childMap = new Map<string, ChildActivities>();

      populatedActivities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        let childIdObj: Types.ObjectId | null = null;
        let childFullName = '';

        if (activity.childId instanceof Types.ObjectId) {
          childIdObj = activity.childId;
          childFullName = activity.child?.fullName || '';
        } else if (activity.childId?._id) {
          childIdObj = activity.childId._id instanceof Types.ObjectId 
            ? activity.childId._id 
            : new Types.ObjectId(String(activity.childId._id));
          childFullName = activity.childId.fullName || activity.child?.fullName || '';
        } else {
          const childIdStr = String(activity.childId);
          if (!Types.ObjectId.isValid(childIdStr)) return;
          childIdObj = new Types.ObjectId(childIdStr);
          childFullName = activity.child?.fullName || '';
        }

        if (!childIdObj) return;

        const childIdStr = childIdObj.toString();

        if (!childMap.has(childIdStr)) {
          childMap.set(childIdStr, {
            child: {
              _id: childIdObj,
              fullName: childFullName,
            },
            activities: {},
          });
        }

        const childData = childMap.get(childIdStr)!;
        const transformedPayload = this.transformActivityPayload(activity.type, activity.payload);
        childData.activities[activity.type] = {
          id: activity._id,
          payload: transformedPayload,
          createdAt: activity.createdAt,
          refId: activity.refId,
        };
      });

      const result: ActivitiesResponse = [];
      childIds.forEach((childId) => {
        const childIdStr = childId instanceof Types.ObjectId ? childId.toString() : String(childId);
        const childData = childMap.get(childIdStr);
        if (childData) {
          result.push(childData);
        }
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to find latest activities by child: ${error.message}`, error.stack);
      throw error;
    }
  }


  private async populateActivitiesForChildren(activities: any[]): Promise<any[]> {
    try {
      const populated = await Promise.all(
        activities.map(async (activity) => {
          if (!activity?._id) return null;

          const doc = await this.wellbeingModel
            .findById(activity._id)
            .populate('refId')
            .populate('childId', 'fullName')
            .populate('createdBy', 'firstName lastName')
            .populate('campuses', 'name')
            .lean()
            .exec();

          if (!doc) return null;

          let payload = doc.payload;
          if ((doc.type === 'nappy-change' || doc.type === 'toilet-training') && payload?.slots) {
            payload = await this.populateStaffInPayload(payload);
          }

          return {
            _id: doc._id,
            type: doc.type,
            childId: doc.childId,
            child: doc.childId,
            payload,
            createdAt: (doc as any).createdAt,
            refId: doc.refId,
          };
        }),
      );

      return populated.filter((activity) => activity !== null);
    } catch (error) {
      this.logger.error(`Failed to populate activities for children: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async populateStaffInPayload(payload: Record<string, any>): Promise<Record<string, any>> {
    if (!payload?.slots || !Array.isArray(payload.slots)) return payload;

    try {
      const staffIds: string[] = [];
      payload.slots.forEach((slot: any) => {
        if (slot.staff) {
          let staffId: string | null = null;
          if (typeof slot.staff === 'string' && Types.ObjectId.isValid(slot.staff)) {
            staffId = slot.staff;
          } else if (slot.staff instanceof Types.ObjectId) {
            staffId = slot.staff.toString();
          } else if (slot.staff?._id) {
            staffId = slot.staff._id.toString();
          }
          if (staffId) {
            staffIds.push(staffId);
          }
        }
      });
      const uniqueStaffIds: string[] = [...new Set(staffIds)];

      if (uniqueStaffIds.length === 0) return payload;

      const staffMembers = await this.userModel
        .find({ _id: { $in: uniqueStaffIds.map((id: string) => new Types.ObjectId(id)) } })
        .select('_id firstName lastName')
        .lean()
        .exec();

      const staffMap = new Map(staffMembers.map((staff) => [staff._id.toString(), staff]));

      return {
        ...payload,
        slots: payload.slots.map((slot: any) => {
          let staffId: string | null = null;
          if (typeof slot.staff === 'string' && Types.ObjectId.isValid(slot.staff)) {
            staffId = slot.staff;
          } else if (slot.staff instanceof Types.ObjectId) {
            staffId = slot.staff.toString();
          } else if (slot.staff?._id) {
            staffId = slot.staff._id.toString();
          }
          
          return {
            ...slot,
            staff: staffId ? (staffMap.get(staffId) || slot.staff) : slot.staff,
          };
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to populate staff in payload: ${error.message}`, error.stack);
      return payload;
    }
  }

  private buildBaseMatch(accessFilter: Record<string, any>, queryDto?: QueryWellbeingDto): Record<string, any> {
    const baseMatch: Record<string, any> = { ...accessFilter, isDeleted: false };

    if (queryDto?.date) {
      const startDate = new Date(`${queryDto.date}T00:00:00.000Z`);
      const endDate = new Date(`${queryDto.date}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }
      baseMatch.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (queryDto?.childId) {
      if (!Types.ObjectId.isValid(queryDto.childId)) {
        throw new BadRequestException('Invalid childId format');
      }
      baseMatch.childId = new Types.ObjectId(queryDto.childId);
    }
    if (queryDto?.type) baseMatch.type = queryDto.type;
    if (queryDto?.campusId) {
      if (!Types.ObjectId.isValid(queryDto.campusId)) {
        throw new BadRequestException('Invalid campusId format');
      }
      baseMatch.campuses = { $in: [new Types.ObjectId(queryDto.campusId)] };
    }
    if (queryDto?.createdBy) {
      if (!Types.ObjectId.isValid(queryDto.createdBy)) {
        throw new BadRequestException('Invalid createdBy format');
      }
      baseMatch.createdBy = new Types.ObjectId(queryDto.createdBy);
    }

    return baseMatch;
  }

  private buildAccessFilter(currentUser: User): Record<string, any> {
    if (isAdministrator(currentUser)) return {};

    if (currentUser.accessScope === 'own_children' && currentUser.children?.length) {
      return {
        childId: {
          $in: currentUser.children
            .filter((id) => Types.ObjectId.isValid(String(id)))
            .map((id) => new Types.ObjectId(String(id))),
        },
      };
    }

    if (currentUser.campuses?.length) {
      return buildStrictCampusInFilterByIds(currentUser.campuses, 'campuses');
    }

    return { _id: { $in: [] } };
  }

  private hasAccessToWellbeingRecord(wellbeing: WellbeingDocument, currentUser: User): boolean {
    if (isAdministrator(currentUser)) return true;

    if (currentUser.accessScope === 'own_children' && currentUser.children?.length) {
      const childIdString = wellbeing.childId.toString();
      return currentUser.children.some((childId) => childId.toString() === childIdString);
    }

    if (currentUser.campuses?.length && wellbeing.campuses?.length) {
      const userCampusIds = currentUser.campuses.map((id) => id.toString());
      const recordCampusIds = wellbeing.campuses.map((id) => id.toString());
      return recordCampusIds.some((campusId) => userCampusIds.includes(campusId));
    }

    return false;
  }

  private transformActivityPayload(type: string, payload: any): any {
    if (!payload) return null;

    if (type === 'nappy-change') {
      // Handle case where payload might not have slots structure
      if (!payload.slots || !Array.isArray(payload.slots) || payload.slots.length === 0) {
        return { doneTime: null, categories: [], staff: null };
      }
      
      const firstSlot = payload.slots[0];
      return {
        doneTime: firstSlot.doneTime && firstSlot.doneTime.trim() ? firstSlot.doneTime : null,
        categories: firstSlot.categories || [],
        staff: firstSlot.staff || null,
      };
    }

    if (type === 'toilet-training') {
      const slots = payload.slots || [];
      if (slots.length === 0) return { doneTime: null, categories: [] };
      
      const firstSlot = slots[0];
      return {
        doneTime: firstSlot.doneTime || null,
        categories: firstSlot.categories || [],
      };
    }

    if (type === 'sleep-timer') {
      return {
        status: payload.status || null,
      };
    }

    if (type === 'daily-chart') {
      const dailyChartItems = payload.dailyChartItems || [];
      const firstItem = dailyChartItems.length > 0 ? dailyChartItems[0] : null;
      
      return {
        category: payload.category || null,
        time: payload.time || null,
        tea_lunch: firstItem?.tea_lunch || null,
      };
    }

    return payload;
  }

  private parseTimeToMinutes(timeString: string): number {
    // Parse time strings like "4:00 AM", "3:48 AM", "12:30 PM"
    try {
      const [time, period] = timeString.trim().split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let totalMinutes = hours * 60 + minutes;
      
      // Convert to 24-hour format
      if (period?.toUpperCase() === 'PM' && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period?.toUpperCase() === 'AM' && hours === 12) {
        totalMinutes -= 12 * 60;
      }
      
      return totalMinutes;
    } catch (error) {
      this.logger.warn(`Failed to parse time string: ${timeString}`);
      return 0;
    }
  }

  async getChildrenSleepDetails(currentUser: User, date?: string): Promise<any[]> {
    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      
      let targetDate: string;
      if (date) {
        targetDate = date;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }

      const startDate = new Date(`${targetDate}T00:00:00.000Z`);
      const endDate = new Date(`${targetDate}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      const query: Record<string, any> = {
        ...accessFilter,
        type: 'sleep-timer',
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      const activities = await this.wellbeingModel
        .find(query)
        .populate('childId', 'fullName')
        .populate('refId')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const childMap = new Map<string, any>();

      activities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        let childId: string;
        if (activity.childId instanceof Types.ObjectId) {
          childId = activity.childId.toString();
        } else if (activity.childId?._id) {
          childId = activity.childId._id.toString();
        } else {
          childId = String(activity.childId);
        }

        const childFullName = activity.childId?.fullName || '';

        if (!childMap.has(childId)) {
          childMap.set(childId, {
            child: {
              _id: childId,
              fullName: childFullName,
            },
            records: [],
            totalSleepingTime: 0,
            latestCreatedAt: null,
            latestUpdatedAt: null,
          });
        }

        const childData = childMap.get(childId);
        if (!childData) return;

        const payload = activity.payload || {};
        const status = payload.status || 'awake';
        const activityCreatedAt = new Date(activity.createdAt);
        const activityUpdatedAt = new Date((activity as any).updatedAt || activity.createdAt);

        if (!childData.latestCreatedAt || activityCreatedAt > new Date(childData.latestCreatedAt)) {
          childData.latestCreatedAt = activity.createdAt;
        }

        if (!childData.latestUpdatedAt || activityUpdatedAt > new Date(childData.latestUpdatedAt)) {
          childData.latestUpdatedAt = (activity as any).updatedAt || activity.createdAt;
        }

        let durationMinutes = 0;
        if (status === 'awake' && payload.startSleepTime && payload.endSleepTime) {
          const startTime = new Date(payload.startSleepTime);
          const endTime = new Date(payload.endSleepTime);
          if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            const durationMs = endTime.getTime() - startTime.getTime();
            if (durationMs > 0) {
              durationMinutes = Math.floor(durationMs / (1000 * 60));
              childData.totalSleepingTime += durationMinutes;
            }
          }
        }

        childData.records.push({
          id: activity._id.toString(),
          status: status,
          startSleepTime: payload.startSleepTime || null,
          endSleepTime: payload.endSleepTime || null,
          duration: durationMinutes,
          createdAt: activity.createdAt,
          updatedAt: (activity as any).updatedAt || activity.createdAt,
          refId: activity.refId,
        });
      });

      const result = Array.from(childMap.values()).map((childData) => {
        const totalHours = Math.floor(childData.totalSleepingTime / 60);
        const totalMinutes = childData.totalSleepingTime % 60;
        const totalSleepingTimeFormatted = `${totalHours}h ${totalMinutes}m`;

        childData.records.sort((a: any, b: any) => {
          if (a.status === 'sleeping' && b.status !== 'sleeping') return -1;
          if (a.status !== 'sleeping' && b.status === 'sleeping') return 1;
          
          const aUpdatedAt = new Date(a.updatedAt || a.createdAt);
          const bUpdatedAt = new Date(b.updatedAt || b.createdAt);
          
          if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
            return bUpdatedAt.getTime() - aUpdatedAt.getTime();
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
          child: childData.child,
          totalSleepingTime: childData.totalSleepingTime,
          totalSleepingTimeFormatted,
          records: childData.records,
          latestCreatedAt: childData.latestCreatedAt,
          latestUpdatedAt: childData.latestUpdatedAt,
        };
      });

      result.sort((a: any, b: any) => {
        const aUpdatedAt = new Date(a.latestUpdatedAt || a.latestCreatedAt);
        const bUpdatedAt = new Date(b.latestUpdatedAt || b.latestCreatedAt);
        
        if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
          return bUpdatedAt.getTime() - aUpdatedAt.getTime();
        }
        
        const aCreatedAt = new Date(a.latestCreatedAt);
        const bCreatedAt = new Date(b.latestCreatedAt);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });

      return result.map(({ latestCreatedAt, latestUpdatedAt, ...rest }) => rest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children sleep details: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChildrenToiletTrainingDetails(currentUser: User, date?: string): Promise<any[]> {
    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      
      let targetDate: string;
      if (date) {
        targetDate = date;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }

      const startDate = new Date(`${targetDate}T00:00:00.000Z`);
      const endDate = new Date(`${targetDate}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      const query: Record<string, any> = {
        ...accessFilter,
        type: 'toilet-training',
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      const activities = await this.wellbeingModel
        .find(query)
        .populate('childId', 'fullName')
        .populate('refId')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const childMap = new Map<string, any>();
      const staffIds: string[] = [];

      activities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        let childId: string;
        if (activity.childId instanceof Types.ObjectId) {
          childId = activity.childId.toString();
        } else if (activity.childId?._id) {
          childId = activity.childId._id.toString();
        } else {
          childId = String(activity.childId);
        }

        const childFullName = activity.childId?.fullName || '';

        if (!childMap.has(childId)) {
          childMap.set(childId, {
            child: {
              _id: childId,
              fullName: childFullName,
            },
            slots: [],
            latestCreatedAt: null,
            latestUpdatedAt: null,
          });
        }

        const childData = childMap.get(childId);
        if (!childData) return;

        const activityCreatedAt = new Date(activity.createdAt);
        const activityUpdatedAt = new Date((activity as any).updatedAt || activity.createdAt);

        if (!childData.latestCreatedAt || activityCreatedAt > new Date(childData.latestCreatedAt)) {
          childData.latestCreatedAt = activity.createdAt;
        }

        if (!childData.latestUpdatedAt || activityUpdatedAt > new Date(childData.latestUpdatedAt)) {
          childData.latestUpdatedAt = (activity as any).updatedAt || activity.createdAt;
        }

        const payload = activity.payload || {};
        const slots = payload.slots || [];

        slots.forEach((slot: any) => {
          if (slot.staff && typeof slot.staff === 'string' && Types.ObjectId.isValid(slot.staff)) {
            staffIds.push(slot.staff);
          }
          childData.slots.push({
            doneTime: slot.doneTime && slot.doneTime.trim() ? slot.doneTime : null,
            categories: slot.categories || [],
            staff: slot.staff || null,
            refId: activity.refId,
            createdAt: activity.createdAt,
            updatedAt: (activity as any).updatedAt || activity.createdAt,
          });
        });
      });

      const uniqueStaffIds = [...new Set(staffIds)];
      const staffMap = new Map();
      if (uniqueStaffIds.length > 0) {
        const staffMembers = await this.userModel
          .find({ _id: { $in: uniqueStaffIds.map((id: string) => new Types.ObjectId(id)) } })
          .select('_id firstName lastName')
          .lean()
          .exec();
        staffMembers.forEach((staff) => {
          staffMap.set(staff._id.toString(), staff);
        });
      }

      const result = Array.from(childMap.values()).map((childData) => {
        childData.slots.sort((a: any, b: any) => {
          const aUpdatedAt = new Date(a.updatedAt || a.createdAt);
          const bUpdatedAt = new Date(b.updatedAt || b.createdAt);
          
          if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
            return bUpdatedAt.getTime() - aUpdatedAt.getTime();
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
          child: childData.child,
          slots: childData.slots.map((slot: any) => ({
            doneTime: slot.doneTime,
            categories: slot.categories,
            staff: slot.staff && typeof slot.staff === 'string' ? staffMap.get(slot.staff) || null : slot.staff,
            refId: slot.refId,
          })),
          latestCreatedAt: childData.latestCreatedAt,
          latestUpdatedAt: childData.latestUpdatedAt,
        };
      });

      result.sort((a: any, b: any) => {
        const aUpdatedAt = new Date(a.latestUpdatedAt || a.latestCreatedAt);
        const bUpdatedAt = new Date(b.latestUpdatedAt || b.latestCreatedAt);
        
        if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
          return bUpdatedAt.getTime() - aUpdatedAt.getTime();
        }
        
        const aCreatedAt = new Date(a.latestCreatedAt);
        const bCreatedAt = new Date(b.latestCreatedAt);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });

      return result.map(({ latestCreatedAt, latestUpdatedAt, ...rest }) => rest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children toilet training details: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChildrenNappyChangeDetails(currentUser: User, date?: string): Promise<any[]> {
    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      
      let targetDate: string;
      if (date) {
        targetDate = date;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }

      const startDate = new Date(`${targetDate}T00:00:00.000Z`);
      const endDate = new Date(`${targetDate}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      const query: Record<string, any> = {
        ...accessFilter,
        type: 'nappy-change',
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      const activities = await this.wellbeingModel
        .find(query)
        .populate('childId', 'fullName')
        .populate('refId')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const childMap = new Map<string, any>();
      const staffIds: string[] = [];

      activities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        let childId: string;
        if (activity.childId instanceof Types.ObjectId) {
          childId = activity.childId.toString();
        } else if (activity.childId?._id) {
          childId = activity.childId._id.toString();
        } else {
          childId = String(activity.childId);
        }

        const childFullName = activity.childId?.fullName || '';

        if (!childMap.has(childId)) {
          childMap.set(childId, {
            child: {
              _id: childId,
              fullName: childFullName,
            },
            slots: [],
            latestCreatedAt: null,
            latestUpdatedAt: null,
          });
        }

        const childData = childMap.get(childId);
        if (!childData) return;

        const activityCreatedAt = new Date(activity.createdAt);
        const activityUpdatedAt = new Date((activity as any).updatedAt || activity.createdAt);

        if (!childData.latestCreatedAt || activityCreatedAt > new Date(childData.latestCreatedAt)) {
          childData.latestCreatedAt = activity.createdAt;
        }

        if (!childData.latestUpdatedAt || activityUpdatedAt > new Date(childData.latestUpdatedAt)) {
          childData.latestUpdatedAt = (activity as any).updatedAt || activity.createdAt;
        }

        const payload = activity.payload || {};
        const slots = payload.slots || [];

        slots.forEach((slot: any) => {
          if (slot.staff && typeof slot.staff === 'string' && Types.ObjectId.isValid(slot.staff)) {
            staffIds.push(slot.staff);
          }
          childData.slots.push({
            doneTime: slot.doneTime && slot.doneTime.trim() ? slot.doneTime : null,
            categories: slot.categories || [],
            staff: slot.staff || null,
            time: slot.time || null,
            refId: activity.refId,
            createdAt: activity.createdAt,
            updatedAt: (activity as any).updatedAt || activity.createdAt,
          });
        });
      });

      const uniqueStaffIds = [...new Set(staffIds)];
      const staffMap = new Map();
      if (uniqueStaffIds.length > 0) {
        const staffMembers = await this.userModel
          .find({ _id: { $in: uniqueStaffIds.map((id: string) => new Types.ObjectId(id)) } })
          .select('_id firstName lastName')
          .lean()
          .exec();
        staffMembers.forEach((staff) => {
          staffMap.set(staff._id.toString(), staff);
        });
      }

      const result = Array.from(childMap.values()).map((childData) => {
        childData.slots.sort((a: any, b: any) => {
          const aUpdatedAt = new Date(a.updatedAt || a.createdAt);
          const bUpdatedAt = new Date(b.updatedAt || b.createdAt);
          
          if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
            return bUpdatedAt.getTime() - aUpdatedAt.getTime();
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
          child: childData.child,
          slots: childData.slots.map((slot: any) => ({
            doneTime: slot.doneTime,
            categories: slot.categories,
            staff: slot.staff && typeof slot.staff === 'string' ? staffMap.get(slot.staff) || null : slot.staff,
            time: slot.time,
            refId: slot.refId,
          })),
          latestCreatedAt: childData.latestCreatedAt,
          latestUpdatedAt: childData.latestUpdatedAt,
        };
      });

      result.sort((a: any, b: any) => {
        const aUpdatedAt = new Date(a.latestUpdatedAt || a.latestCreatedAt);
        const bUpdatedAt = new Date(b.latestUpdatedAt || b.latestCreatedAt);
        
        if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
          return bUpdatedAt.getTime() - aUpdatedAt.getTime();
        }
        
        const aCreatedAt = new Date(a.latestCreatedAt);
        const bCreatedAt = new Date(b.latestCreatedAt);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });

      return result.map(({ latestCreatedAt, latestUpdatedAt, ...rest }) => rest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children nappy change details: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChildrenDailyChartDetails(currentUser: User, date?: string): Promise<any[]> {
    try {
      const accessFilter = this.buildAccessFilter(currentUser);
      
      let targetDate: string;
      if (date) {
        targetDate = date;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`;
      }

      const startDate = new Date(`${targetDate}T00:00:00.000Z`);
      const endDate = new Date(`${targetDate}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      const query: Record<string, any> = {
        ...accessFilter,
        type: 'daily-chart',
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      const activities = await this.wellbeingModel
        .find(query)
        .populate('childId', 'fullName')
        .populate('refId')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const childMap = new Map<string, any>();

      activities.forEach((activity: any) => {
        if (!activity || !activity.childId) return;

        let childId: string;
        if (activity.childId instanceof Types.ObjectId) {
          childId = activity.childId.toString();
        } else if (activity.childId?._id) {
          childId = activity.childId._id.toString();
        } else {
          childId = String(activity.childId);
        }

        const childFullName = activity.childId?.fullName || '';

        if (!childMap.has(childId)) {
          childMap.set(childId, {
            child: {
              _id: childId,
              fullName: childFullName,
            },
            date: null,
            categories: new Map(),
            childrenBottles: [],
            latestCreatedAt: null,
            latestUpdatedAt: null,
          });
        }

        const childData = childMap.get(childId);
        if (!childData) return;

        const activityCreatedAt = new Date(activity.createdAt);
        const activityUpdatedAt = new Date((activity as any).updatedAt || activity.createdAt);

        if (!childData.latestCreatedAt || activityCreatedAt > new Date(childData.latestCreatedAt)) {
          childData.latestCreatedAt = activity.createdAt;
        }

        if (!childData.latestUpdatedAt || activityUpdatedAt > new Date(childData.latestUpdatedAt)) {
          childData.latestUpdatedAt = (activity as any).updatedAt || activity.createdAt;
        }

        const payload = activity.payload || {};
        const category = payload.category || null;
        const time = payload.time || null;
        const childrenBottles = payload.childrenBottles || [];
        
        // Check if this is a category entry or childrenBottles entry
        const isCategoryEntry = category !== null && payload.dailyChartItems;
        const isChildrenBottlesEntry = !category && Array.isArray(childrenBottles) && childrenBottles.length > 0;
        
        // Extract date from payload or refId (populated daily chart) - set at child level
        if (!childData.date) {
          let date: string | null = null;
          if (payload.date) {
            // Date from payload (ISO string format)
            const dateObj = new Date(payload.date);
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toISOString().split('T')[0];
            }
          } else if (activity.refId?.date) {
            // Date from populated refId (daily chart document)
            const dateObj = activity.refId.date instanceof Date 
              ? activity.refId.date 
              : new Date(activity.refId.date);
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toISOString().split('T')[0];
            }
          }
          childData.date = date;
        }

        // Process category entries (morning_tea, lunch, afternoon_tea, crunch_and_sip)
        if (isCategoryEntry) {
          const dailyChartItems = payload.dailyChartItems || null;
          const categoryKey = category === 'morning_tea' ? 'morning_tea' :
                             category === 'lunch' ? 'lunch' :
                             category === 'afternoon_tea' ? 'afternoon_tea' :
                             category === 'crunch_and_sip' ? 'crunch_and_sip' : null;

          if (categoryKey && dailyChartItems) {
            let itemsForCategory: any[] = [];
            
            if (Array.isArray(dailyChartItems)) {
              itemsForCategory = dailyChartItems;
            } else if (typeof dailyChartItems === 'object' && dailyChartItems !== null) {
              itemsForCategory = dailyChartItems[categoryKey] || [];
            }

            if (!childData.categories.has(categoryKey)) {
              childData.categories.set(categoryKey, {
                category: categoryKey,
                time: time,
                dailyChartItems: [],
                createdAt: activity.createdAt,
                updatedAt: (activity as any).updatedAt || activity.createdAt,
              });
            }

            const categoryData = childData.categories.get(categoryKey);
            if (categoryData) {
              if (Array.isArray(itemsForCategory) && itemsForCategory.length > 0) {
                categoryData.dailyChartItems.push(...itemsForCategory);
              }
              
              const categoryUpdatedAt = new Date(categoryData.updatedAt);
              if (activityUpdatedAt > categoryUpdatedAt) {
                categoryData.updatedAt = (activity as any).updatedAt || activity.createdAt;
                categoryData.time = time || categoryData.time;
              }
            }
          }
        }

        // Process childrenBottles entry (separate entry, no category)
        // Only process if this is a childrenBottles entry and we haven't already added bottles for this child
        if (isChildrenBottlesEntry) {
          // Check if we already have childrenBottles for this child (should only be one entry per child)
          const hasExistingBottles = childData.childrenBottles.length > 0;
          
          if (!hasExistingBottles) {
            // Find the child's bottle entry
            const childBottleEntry = childrenBottles.find((bottleEntry: any) => {
              if (!bottleEntry || !bottleEntry.child) return false;
              const bottleChildId = bottleEntry.child instanceof Types.ObjectId 
                ? bottleEntry.child.toString() 
                : (bottleEntry.child?._id?.toString() || String(bottleEntry.child));
              return bottleChildId === childId;
            });

            if (childBottleEntry) {
              childData.childrenBottles.push({
                child: childBottleEntry.child,
                bottles: Array.isArray(childBottleEntry.bottles) ? childBottleEntry.bottles : [],
              });
            }
          }
        }
      });

      const result = Array.from(childMap.values()).map((childData) => {
        const categories = Array.from(childData.categories.values()).map((catData: any) => ({
          category: catData.category,
          time: catData.time,
          dailyChartItems: catData.dailyChartItems,
          createdAt: catData.createdAt,
          updatedAt: catData.updatedAt,
        }));

        categories.sort((a: any, b: any) => {
          const aUpdatedAt = new Date(a.updatedAt || a.createdAt);
          const bUpdatedAt = new Date(b.updatedAt || b.createdAt);
          
          if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
            return bUpdatedAt.getTime() - aUpdatedAt.getTime();
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return {
          child: childData.child,
          date: childData.date,
          categories: categories.map((cat: any) => ({
            category: cat.category,
            time: cat.time,
            dailyChartItems: cat.dailyChartItems,
          })),
          childrenBottles: childData.childrenBottles,
          latestCreatedAt: childData.latestCreatedAt,
          latestUpdatedAt: childData.latestUpdatedAt,
        };
      });

      result.sort((a: any, b: any) => {
        const aUpdatedAt = new Date(a.latestUpdatedAt || a.latestCreatedAt);
        const bUpdatedAt = new Date(b.latestUpdatedAt || b.latestCreatedAt);
        
        if (aUpdatedAt.getTime() !== bUpdatedAt.getTime()) {
          return bUpdatedAt.getTime() - aUpdatedAt.getTime();
        }
        
        const aCreatedAt = new Date(a.latestCreatedAt);
        const bCreatedAt = new Date(b.latestCreatedAt);
        return bCreatedAt.getTime() - aCreatedAt.getTime();
      });

      return result.map(({ latestCreatedAt, latestUpdatedAt, ...rest }) => rest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children daily chart details: ${error.message}`, error.stack);
      throw error;
    }
  }
}
