import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { CommentsService } from '../comments/services/comments.service';
import { isAdministrator } from 'src/common/access/access-filter.util';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(FeedItem.name)
    private feedItemModel: Model<FeedItemDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => CommentsService))
    private commentsService: CommentsService,
  ) {}

  async create(
    createFeedItemDto: CreateFeedItemDto,
    userId: string,
  ): Promise<FeedItem> {
    // Map type to model name for dynamic populate
    const typeToModel: Record<string, string> = {
      poll: 'Poll',
      announcement: 'Announcement',
      event: 'Event',
      survey: 'Survey',
      'daily-journal': 'DailyJournal',
      breakfast: 'Breakfast',
      'grove-curriculum': 'GroveCurriculum',
      'year-report': 'YearReport',
      'immunisation-reminder': 'ImmunisationReminder',
      'new-staff': 'User',
    };

    const feedItem = new this.feedItemModel({
      ...createFeedItemDto,
      campuses: createFeedItemDto.campuses?.map((id) => new Types.ObjectId(id)),
      rooms: createFeedItemDto.rooms?.map((id) => new Types.ObjectId(id)),
      refId: new Types.ObjectId(createFeedItemDto.refId),
      refModel: typeToModel[createFeedItemDto.type], // Set refModel for dynamic populate
      createdBy: new Types.ObjectId(userId),
      visibleFrom: createFeedItemDto.visibleFrom
        ? new Date(createFeedItemDto.visibleFrom)
        : undefined,
      visibleUntil: createFeedItemDto.visibleUntil
        ? new Date(createFeedItemDto.visibleUntil)
        : undefined,
    });

    return feedItem.save();
  }

  async listForUser(
    userCampuses: Types.ObjectId[],
    queryDto: QueryFeedDto = {},
    currentUser?: any,
    userRooms?: Types.ObjectId[],
  ): Promise<any[]> {
    const { type, campusId, after, limit = 20, status = 'active', search, selectedChildren, date, month } = queryDto;
    
    const now = new Date();
    const filter: any = {
      status,
      isDeleted: false,
    };

    // Apply date filtering for all types including polls
    // Polls now have pollDate which is used as visibleFrom
    filter.$and = [
      { $or: [{ visibleFrom: null }, { visibleFrom: { $lte: now } }] },
      { $or: [{ visibleUntil: null }, { visibleUntil: { $gte: now } }] },
    ];

    // Campus targeting (strict for non-admin)
    const isAdmin = isAdministrator(currentUser);
    let campusOrCondition: any = null;
    if (campusId) {
      const cid = new Types.ObjectId(campusId);
      if (isAdmin) {
        // Admin can see global + specific campus for requested campusId
        campusOrCondition = [
          { campuses: cid },
          { isForAllCampuses: true },
        ];
      } else {
        // Non-admin must own this campusId; no global
        const allowed = new Set((userCampuses || []).map((c) => c?.toString()));
        if (allowed.has(cid.toString())) {
          filter.campuses = cid;
        } else {
          filter._id = { $in: [] } as any;
        }
      }
    } else if (userCampuses && userCampuses.length > 0) {
      if (isAdmin) {
        // Admin without campus filter: no restriction
      } else {
        // Non-admin: own campuses + global items
        campusOrCondition = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      }
    } else {
      // No assigned campuses
      if (!isAdmin) {
        filter._id = { $in: [] } as any;
      }
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Room-based filtering for new-staff type
    // For new-staff type, filter by rooms when userRooms are provided
    if (filter.type === 'new-staff' && userRooms && userRooms.length > 0) {
      filter.rooms = { $in: userRooms };
    }

    // Filter by month for grove-curriculum type
    if (type === 'grove-curriculum' && month) {
      // First, find grove-curriculum IDs that match the month
      const GroveCurriculum = this.feedItemModel.db.model('GroveCurriculum');
      const groveCurriculums = await GroveCurriculum.find({
        month,
        isDeleted: false,
      })
        .select('_id')
        .lean()
        .exec();
      
      const groveCurriculumIds = groveCurriculums.map((gc: any) => gc._id);
      
      if (groveCurriculumIds.length > 0) {
        filter.refId = { $in: groveCurriculumIds };
      } else {
        // No grove-curriculum found for this month, return empty
        filter._id = { $in: [] };
      }
    }

    // Filter by specific date
    if (date) {
      const dateObj = new Date(date);
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (after) {
      // Pagination by date
      filter.createdAt = { $lt: new Date(after) };
    }

    // Combine campus and search filters
    const searchOrCondition = search ? [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ] : null;

    if (campusOrCondition && searchOrCondition) {
      filter.$and = [
        ...filter.$and,
        { $or: campusOrCondition },
        { $or: searchOrCondition },
      ];
    } else if (campusOrCondition) {
      filter.$or = campusOrCondition;
    } else if (searchOrCondition) {
      filter.$or = searchOrCondition;
    }

    const feedItems = await this.feedItemModel
      .find(filter)
      .sort({ isPinned: -1, createdAt: -1, _id: -1 })
      .limit(Math.min(limit, 100))
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .populate({
        path: 'refId',
        select: this.getSelectFieldsByType(),
      })
      .lean()
      .exec();

    const processedItems = await this.enrichRefsByTypeBatch(feedItems);

    // Attach visible children info to each feed item
    let processedFeedItems = processedItems;
    if (selectedChildren && selectedChildren.length > 0) {
      processedFeedItems = this.attachVisibleChildren(processedItems, selectedChildren);
    }

    if (currentUser) {
      processedFeedItems = await this.attachLikeStatusAndCounts(processedFeedItems, currentUser);
    }
    return processedFeedItems;
  }

  private async enrichRefsByTypeBatch(feedItems: any[]): Promise<any[]> {
    const byType: Record<string, { id: string; item: any }[]> = {};
    for (const item of feedItems) {
      if (!item.refId?._id) continue;
      const t = item.type;
      if (!byType[t]) byType[t] = [];
      byType[t].push({ id: item.refId._id.toString(), item });
    }
    const DailyJournal = this.feedItemModel.db.model('DailyJournal');
    const Breakfast = this.feedItemModel.db.model('Breakfast');
    const GroveCurriculum = this.feedItemModel.db.model('GroveCurriculum');
    const YearReport = this.feedItemModel.db.model('YearReport');
    const LearningJourney = this.feedItemModel.db.model('LearningJourney');
    const ImmunisationReminder = this.feedItemModel.db.model('ImmunisationReminder');
    const UserModel = this.feedItemModel.db.model('User');
    const enrichTasks: Promise<void>[] = [];
    if (byType['daily-journal']?.length) {
      const ids = byType['daily-journal'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        DailyJournal.find({ _id: { $in: ids } })
          .populate('child', 'fullName')
          .populate('campus', 'name')
          .populate('room', 'name')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['daily-journal'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['breakfast']?.length) {
      const ids = byType['breakfast'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        Breakfast.find({ _id: { $in: ids } })
          .populate('campus', 'name')
          .populate('childrenEntries.child', 'fullName')
          .populate('createdBy', 'firstName lastName')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['breakfast'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['grove-curriculum']?.length) {
      const ids = byType['grove-curriculum'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        GroveCurriculum.find({ _id: { $in: ids } })
          .populate('campus', 'name')
          .populate('room', 'name')
          .populate('createdBy', 'firstName lastName')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['grove-curriculum'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['year-report']?.length) {
      const ids = byType['year-report'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        YearReport.find({ _id: { $in: ids } })
          .populate('campus', 'name')
          .populate('room', 'name')
          .populate('children', 'fullName')
          .populate('createdBy', 'firstName lastName')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['year-report'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['learning-journey']?.length) {
      const ids = byType['learning-journey'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        LearningJourney.find({ _id: { $in: ids } })
          .populate('campus', 'name')
          .populate('room', 'name')
          .populate('children', 'fullName')
          .populate('createdBy', 'firstName lastName')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['learning-journey'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['immunisation-reminder']?.length) {
      const ids = byType['immunisation-reminder'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        ImmunisationReminder.find({ _id: { $in: ids } })
          .populate('childId', 'fullName dateOfBirth profileImage')
          .populate('campusId', 'name')
          .populate('roomId', 'name')
          .populate('respondedBy', 'firstName lastName')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['immunisation-reminder'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    if (byType['new-staff']?.length) {
      const ids = byType['new-staff'].map((x) => new Types.ObjectId(x.id));
      enrichTasks.push(
        UserModel.find({ _id: { $in: ids } })
          .populate('campuses', 'name')
          .populate('rooms', 'name')
          .select('firstName lastName email role campuses rooms')
          .lean()
          .exec()
          .then((docs: any[]) => {
            const map = new Map(docs.map((d) => [d._id.toString(), d]));
            byType['new-staff'].forEach(({ id, item }) => {
              const pop = map.get(id);
              if (pop) item.refId = { ...item.refId, ...pop };
            });
          }),
      );
    }
    await Promise.all(enrichTasks);
    return feedItems;
  }

  private async attachLikeStatusAndCounts(feedItems: any[], currentUser: any): Promise<any[]> {
    const likeableTypes = ['announcement', 'event', 'daily-journal', 'year-report'];
    const refs: Array<{ refId: string; entityType: 'announcement' | 'event' | 'dailyJournal' | 'yearReport' }> = [];
    const likeableItems: any[] = [];
    feedItems.forEach((feedItem) => {
      if (!likeableTypes.includes(feedItem.type) || !feedItem.refId?._id) return;
      const entityType =
        feedItem.type === 'daily-journal' ? 'dailyJournal' : feedItem.type === 'year-report' ? 'yearReport' : feedItem.type;
      refs.push({ refId: feedItem.refId._id.toString(), entityType });
      likeableItems.push(feedItem);
    });
    const userId = (currentUser._id ?? currentUser.id)?.toString?.() ?? currentUser;
    const likedSet = refs.length > 0 ? await this.commentsService.getLikedRefIdsBatch(refs, userId) : new Set<string>();
    const key = (id: string, type: string) => `${id}:${type}`;
    return feedItems.map((feedItem) => {
      if (!likeableTypes.includes(feedItem.type)) return feedItem;
      const entityType =
        feedItem.type === 'daily-journal' ? 'dailyJournal' : feedItem.type === 'year-report' ? 'yearReport' : feedItem.type;
      const refIdStr = feedItem.refId._id.toString();
      const liked = likedSet.has(key(refIdStr, entityType));
      const likeCount =
        feedItem.type === 'daily-journal'
          ? (feedItem.refId?.likesCount ?? feedItem.refId?.likeCount ?? 0)
          : (feedItem.refId?.likeCount ?? feedItem.refId?.likesCount ?? 0);
      const commentCount =
        feedItem.type === 'daily-journal'
          ? (feedItem.refId?.commentsCount ?? feedItem.refId?.commentCount ?? 0)
          : (feedItem.refId?.commentCount ?? feedItem.refId?.commentsCount ?? 0);
      return { ...feedItem, liked, likeCount, commentCount };
    });
  }

  /**
   * Attach visible children information to feed items
   * Shows which children can see each feed item based on campus targeting
   */
  private attachVisibleChildren(feedItems: any[], allChildren: any[]): any[] {
    return feedItems.map((feedItem) => {
      let visibleChildren: any[] = [];

      if (feedItem.isForAllCampuses) {
        // Global items visible to all children
        visibleChildren = allChildren.map((child) => ({
          _id: child._id,
          name: child.fullName || 'Unknown',
        }));
      } else {
        // Filter children by matching campus
        const feedCampusIds = (feedItem.campuses || []).map((campus: any) =>
          campus._id ? campus._id.toString() : campus.toString(),
        );

        visibleChildren = allChildren
          .filter((child) => {
            const childCampusId = child.campus._id
              ? child.campus._id.toString()
              : child.campus.toString();
            return feedCampusIds.includes(childCampusId);
          })
          .map((child) => ({
            _id: child._id,
            name: child.fullName || 'Unknown',
          }));
      }

      return {
        ...feedItem,
        visibleChildren,
      };
    });
  }

  /**
   * Get select fields based on populated model type
   * This is a helper for consistent field selection
   */
  private getSelectFieldsByType(): string {
    return 'title description questions isMultipleSelect isCommentEnabled status content priority startDate endDate location shortDescription featuredImage bannerUrl rsvpRequired photos date campus room child publishedDate scheduleAt visibility allowComments allowTrackbacks childrenEntries status visibility publishedDate likeCount commentCount likesCount commentsCount';
  }

  async findOne(id: string, userCampuses?: Types.ObjectId[]): Promise<any> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      isDeleted: false,
    };

    if (userCampuses && userCampuses.length > 0) {
      filter.$or = [
        { isForAllCampuses: true },
        { campuses: { $in: userCampuses } },
      ];
    }

    const feedItem = await this.feedItemModel
      .findOne(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('campuses', 'name')
      .populate({
        path: 'refId',
        select: this.getSelectFieldsByType(),
      })
      .lean()
      .exec();

    if (feedItem && feedItem.type === 'daily-journal' && feedItem.refId) {
      const DailyJournal = this.feedItemModel.db.model('DailyJournal');
      const populated = await DailyJournal.findById(feedItem.refId._id)
        .populate('child', 'fullName')
        .populate('campus', 'name')
        .populate('room', 'name')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'breakfast' && feedItem.refId) {
      const Breakfast = this.feedItemModel.db.model('Breakfast');
      const populated = await Breakfast.findById(feedItem.refId._id)
        .populate('campus', 'name')
        .populate('childrenEntries.child', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'grove-curriculum' && feedItem.refId) {
      const GroveCurriculum = this.feedItemModel.db.model('GroveCurriculum');
      const populated = await GroveCurriculum.findById(feedItem.refId._id)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('createdBy', 'firstName lastName')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'year-report' && feedItem.refId) {
      const YearReport = this.feedItemModel.db.model('YearReport');
      const populated = await YearReport.findById(feedItem.refId._id)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'learning-journey' && feedItem.refId) {
      const LearningJourney = this.feedItemModel.db.model('LearningJourney');
      const populated = await LearningJourney.findById(feedItem.refId._id)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'immunisation-reminder' && feedItem.refId) {
      const ImmunisationReminder = this.feedItemModel.db.model('ImmunisationReminder');
      const populated = await ImmunisationReminder.findById(feedItem.refId._id)
        .populate('childId', 'fullName dateOfBirth profileImage')
        .populate('campusId', 'name')
        .populate('roomId', 'name')
        .populate('respondedBy', 'firstName lastName')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (feedItem && feedItem.type === 'new-staff' && feedItem.refId) {
      const User = this.feedItemModel.db.model('User');
      const populated = await User.findById(feedItem.refId._id)
        .populate('campuses', 'name')
        .populate('rooms', 'name')
        .select('firstName lastName email role campuses rooms')
        .lean()
        .exec();
      if (populated) {
        (feedItem as any).refId = { ...feedItem.refId, ...populated };
      }
    }

    if (!feedItem) {
      throw new NotFoundException('Feed item not found');
    }

    return feedItem;
  }

  async update(
    id: string,
    updateDto: Partial<CreateFeedItemDto>,
  ): Promise<FeedItem> {
    const feedItem = await this.feedItemModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!feedItem) {
      throw new NotFoundException('Feed item not found');
    }

    Object.assign(feedItem, {
      ...updateDto,
      campuses: updateDto.campuses?.map((id) => new Types.ObjectId(id)),
      visibleFrom: updateDto.visibleFrom
        ? new Date(updateDto.visibleFrom)
        : feedItem.visibleFrom,
      visibleUntil: updateDto.visibleUntil
        ? new Date(updateDto.visibleUntil)
        : feedItem.visibleUntil,
    });

    return feedItem.save();
  }

  async archive(id: string): Promise<FeedItem> {
    const feedItem = await this.feedItemModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!feedItem) {
      throw new NotFoundException('Feed item not found');
    }

    feedItem.status = 'archived';
    return feedItem.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.feedItemModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { isDeleted: true } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Feed item not found');
    }
  }

  async togglePin(id: string): Promise<FeedItem> {
    const feedItem = await this.feedItemModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!feedItem) {
      throw new NotFoundException('Feed item not found');
    }

    feedItem.isPinned = !feedItem.isPinned;
    return feedItem.save();
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.feedItemModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $inc: { viewCount: 1 } },
    );
  }

  /**
   * Helper method to automatically create a feed item from a poll
   */
  async createFromPoll(
    pollId: string,
    title: string,
    description: string,
    isForAllCampuses: boolean,
    campuses: string[],
    userId: string,
    pollDate?: Date,
  ): Promise<FeedItem> {
    return this.create(
      {
        type: 'poll',
        refId: pollId,
        title,
        description,
        isForAllCampuses,
        campuses,
        visibleFrom: pollDate?.toISOString(),
        visibleUntil: undefined,
      },
      userId,
    );
  }

  /**
   * Get dates that have feed items for a specific type in a given month
   * Returns array of dates in YYYY-MM-DD format
   */
  async getDatesByTypeAndMonth(
    type: string,
    month: string, // Format: YYYY-MM (e.g., "2025-11")
    userCampuses: Types.ObjectId[],
    currentUser?: any,
  ): Promise<string[]> {
    // Parse month (YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Invalid month format. Expected YYYY-MM (e.g., 2025-11)');
    }

    // Calculate start and end of month
    const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Build filter
    const filter: any = {
      type,
      isDeleted: false,
      status: 'active',
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Apply campus filtering for non-admin users
    const isAdmin = isAdministrator(currentUser);
    if (!isAdmin && userCampuses && userCampuses.length > 0) {
      filter.$or = [
        { campuses: { $in: userCampuses } },
        { isForAllCampuses: true },
      ];
    }

    // Use aggregation to get unique dates
    const result = await this.feedItemModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id' } },
    ]).exec();

    return result.map((item) => item.date);
  }

  /**
   * Get all months that have data for a specific type in a given year
   * Returns array of month names where data exists
   */
  async getMonthsByTypeAndYear(
    type: string,
    year: string, // Format: "2025"
    userCampuses: Types.ObjectId[],
    currentUser?: any,
  ): Promise<string[]> {
    if (type === 'grove-curriculum') {
      // For grove-curriculum, check the GroveCurriculum collection directly
      const GroveCurriculum = this.feedItemModel.db.model('GroveCurriculum');
      
      // Build filter
      const filter: any = {
        isDeleted: false,
        year,
      };

      // Apply campus filtering for non-admin users
      const isAdmin = isAdministrator(currentUser);
      if (!isAdmin && userCampuses && userCampuses.length > 0) {
        filter.campus = { $in: userCampuses };
      }

      // Get unique months
      const result = await GroveCurriculum.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$month',
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: '$_id' } },
      ]).exec();

      return result.map((item) => item.month).filter(Boolean);
    } else {
      // For other types, check feed items by year
      const yearNum = parseInt(year);
      if (isNaN(yearNum)) {
        throw new BadRequestException('Invalid year format. Expected YYYY (e.g., 2025)');
      }

      // Calculate start and end of year
      const startDate = new Date(yearNum, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);

      const filter: any = {
        type,
        isDeleted: false,
        status: 'active',
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      // Apply campus filtering for non-admin users
      const isAdmin = isAdministrator(currentUser);
      if (!isAdmin && userCampuses && userCampuses.length > 0) {
        filter.$or = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      }

      // Get unique months from createdAt
      const result = await this.feedItemModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%B', // Full month name (January, February, etc.)
                date: '$createdAt',
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: '$_id' } },
      ]).exec();

      return result.map((item) => item.month).filter(Boolean);
    }
  }

}

