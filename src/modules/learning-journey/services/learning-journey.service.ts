import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { LearningJourney, LearningJourneyStatus } from '../schemas/learning-journey.schema';
import { CreateLearningJourneyDto, ApiLearningJourneyStatus } from '../dto/create-learning-journey.dto';
import { UpdateLearningJourneyDto } from '../dto/update-learning-journey.dto';
import { QueryLearningJourneyDto } from '../dto/query-learning-journey.dto';
import { User } from '../../users/schemas/user.schema';
import { DailyJournal } from '../../daily-journal/schemas/daily-journal.schema';
import { LearningJourneyDailyJournalQueryDto } from '../dto/learning-journey-dailyjournal-query.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { WellnessPlan } from '../../wellness-plan/schemas/wellness-plan.schema';

@Injectable()
export class LearningJourneyService {
  constructor(
    @InjectModel(LearningJourney.name)
    private readonly learningJourneyModel: Model<LearningJourney>,
    @InjectModel(DailyJournal.name)
    private readonly dailyJournalModel: Model<DailyJournal>,
    @InjectModel(WellnessPlan.name)
    private readonly wellnessPlanModel: Model<WellnessPlan>,
  ) {}

  async create(dto: CreateLearningJourneyDto, currentUser: User): Promise<LearningJourney> {
    const status = dto.status === ApiLearningJourneyStatus.PUBLISHED ? LearningJourneyStatus.PUBLISHED : LearningJourneyStatus.DRAFT;
    const childId = new Types.ObjectId(dto.children);
    const existingJourneys = await this.learningJourneyModel
      .find({ children: childId, isDeleted: false })
      .select('goalEvaluations')
      .lean()
      .exec();
    const goalTextToIdMap = new Map<string, string>();
    existingJourneys.forEach((journey: any) => {
      if (Array.isArray(journey.goalEvaluations)) {
        journey.goalEvaluations.forEach((goal: any) => {
          if (goal.goal && goal.goalEvaluationsId) {
            const normalizedGoal = goal.goal.trim().toLowerCase();
            if (!goalTextToIdMap.has(normalizedGoal)) {
              goalTextToIdMap.set(normalizedGoal, goal.goalEvaluationsId);
            }
          }
        });
      }
    });
    const goalEvaluations = [
      ...(dto.goalEvaluations?.map((item) => {
        const completeValue = item.complete === true || String(item.complete || '').toLowerCase() === 'true';
        const normalizedGoal = (item.goal || '').trim().toLowerCase();
        const goalEvaluationsId = item.goalEvaluationsId || goalTextToIdMap.get(normalizedGoal) || uuidv4();
        return {
          goalEvaluationsId,
          goal: item.goal || '',
          evaluation: item.evaluation || '',
          complete: completeValue,
        };
      }) || []),
      ...(dto.newGoals?.map((goalText) => {
        const normalizedGoal = (goalText || '').trim().toLowerCase();
        const goalEvaluationsId = goalTextToIdMap.get(normalizedGoal) || uuidv4();
        return {
          goalEvaluationsId,
          goal: goalText || '',
          evaluation: '',
          complete: false,
        };
      }) || []),
    ];
    const created = new this.learningJourneyModel({
      campus: new Types.ObjectId(dto.campus),
      room: new Types.ObjectId(dto.room),
      children: new Types.ObjectId(dto.children),
      date: dto.date ? new Date(dto.date) : undefined,
      publishedDate: status === LearningJourneyStatus.PUBLISHED ? (dto.publishedDate ? new Date(dto.publishedDate) : new Date()) : undefined,
      completedBy: dto.completedBy ? new Types.ObjectId(dto.completedBy) : undefined,
      status,
      monthOne: dto.monthOne,
      monthTwo: dto.monthTwo,
      year: dto.year,
      previousStrengths: dto.previousStrengths,
      newStrengths: dto.newStrengths,
      newInterests: dto.newInterests,
      goalEvaluations,
      newGoals: dto.newGoals,
      individualLearning: dto.individualLearning?.map((item) => ({ ...item, date: item.date ? new Date(item.date) : undefined })),
      futurePlanning: dto.futurePlanning?.map((item) => ({ ...item, date: item.date ? new Date(item.date) : undefined })),
      educationalTheorists: dto.educationalTheorists,
      outcomes: dto.outcomes,
      allowComments: dto.allowComments,
      allowTrackbacks: dto.allowTrackbacks,
      createdBy: currentUser._id,
      isDeleted: false,
    });
    const saved = await created.save();
    const completedGoalIds = goalEvaluations
      .filter((item) => item.complete && item.goalEvaluationsId)
      .map((item) => item.goalEvaluationsId);
    if (completedGoalIds.length > 0) {
      await this.learningJourneyModel.updateMany(
        {
          children: childId,
          _id: { $ne: saved._id },
          isDeleted: false,
          'goalEvaluations.goalEvaluationsId': { $in: completedGoalIds },
        },
        {
          $set: {
            'goalEvaluations.$[elem].complete': true,
            updatedBy: currentUser._id,
          },
        },
        {
          arrayFilters: [{ 'elem.goalEvaluationsId': { $in: completedGoalIds } }],
        },
      );
    }
    const result = await this.learningJourneyModel
      .findById(saved._id)
      .select('-newGoals')
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    return result || saved;
  }

  async findAll(query?: QueryLearningJourneyDto): Promise<LearningJourney[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      date?: DateRange;
      children?: Types.ObjectId;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.children) {
      filter.children = new Types.ObjectId(query.children);
    }
    let effectiveYear: number | undefined;
    let effectiveMonth: number | undefined;
    if (query?.date) {
      const [yearPart, monthPart] = query.date.split('-');
      const parsedYear = Number(yearPart);
      const parsedMonth = Number(monthPart);
      if (Number.isFinite(parsedYear)) {
        effectiveYear = parsedYear;
      }
      if (Number.isFinite(parsedMonth)) {
        effectiveMonth = parsedMonth;
      }
    }
    if (query?.year !== undefined) {
      const parsedYear = Number(query.year);
      if (Number.isFinite(parsedYear)) {
        effectiveYear = parsedYear;
      }
    }
    if (query?.month !== undefined) {
      const parsedMonth = Number(query.month);
      if (Number.isFinite(parsedMonth)) {
        effectiveMonth = parsedMonth;
      }
    }
    if (effectiveYear !== undefined && effectiveMonth !== undefined) {
      const startDate = new Date(effectiveYear, effectiveMonth - 1, 1);
      const endDate = new Date(effectiveYear, effectiveMonth, 1);
      filter.date = { $gte: startDate, $lt: endDate };
    } else if (effectiveYear !== undefined) {
      const startDate = new Date(effectiveYear, 0, 1);
      const endDate = new Date(effectiveYear + 1, 0, 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const mongoFilter: Record<string, unknown> = { ...filter };
    if (effectiveYear === undefined && effectiveMonth !== undefined) {
      mongoFilter.$expr = { $eq: [{ $month: '$date' }, effectiveMonth] };
    }
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.learningJourneyModel
        .find(mongoFilter)
        .select('-newGoals')
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec();
      const filtered = allResults.filter((item: any) => {
        const child = item.children as any;
        return child && typeof child.fullName === 'string' && searchRegex.test(child.fullName);
      });
      const start = skip;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
    return this.learningJourneyModel
      .find(mongoFilter)
      .select('-newGoals')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string): Promise<LearningJourney> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid learning journey ID format');
    }
    const journey = await this.learningJourneyModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!journey) {
      throw new NotFoundException('Learning journey not found');
    }
    return journey;
  }

  async update(id: string, dto: UpdateLearningJourneyDto, currentUser: User): Promise<LearningJourney> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid learning journey ID format');
    }
    const updatePayload: Record<string, unknown> = { updatedBy: currentUser._id };
    if (dto.date !== undefined) {
      if (dto.date) {
        const date = new Date(dto.date);
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException('Invalid date format');
        }
        updatePayload.date = date;
      } else {
        updatePayload.date = null;
      }
    }
    if (dto.campus) {
      updatePayload.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.room) {
      updatePayload.room = new Types.ObjectId(dto.room);
    }
    if (dto.children) {
      updatePayload.children = new Types.ObjectId(dto.children);
    }
    if (dto.completedBy) {
      updatePayload.completedBy = new Types.ObjectId(dto.completedBy);
    }
    if (dto.status !== undefined) {
      updatePayload.status =
        dto.status === ApiLearningJourneyStatus.PUBLISHED
          ? LearningJourneyStatus.PUBLISHED
          : LearningJourneyStatus.DRAFT;
    }
    if (dto.publishedDate !== undefined) {
      if (dto.publishedDate) {
        const publishedDate = new Date(dto.publishedDate);
        if (Number.isNaN(publishedDate.getTime())) {
          throw new BadRequestException('Invalid published date format');
        }
        updatePayload.publishedDate = publishedDate;
      } else {
        updatePayload.publishedDate = null;
      }
    }
    if (dto.status === ApiLearningJourneyStatus.PUBLISHED && updatePayload.publishedDate === undefined) {
      updatePayload.publishedDate = new Date();
    }
    if (dto.status !== undefined && dto.status !== ApiLearningJourneyStatus.PUBLISHED) {
      updatePayload.publishedDate = null;
    }
    if (dto.individualLearning !== undefined) {
      if (Array.isArray(dto.individualLearning)) {
        updatePayload.individualLearning = dto.individualLearning.map((item) => ({
          date: item.date ? new Date(item.date) : undefined,
          photos: Array.isArray(item.photos) ? item.photos : [],
          learning: item.learning || '',
        }));
      } else {
        updatePayload.individualLearning = [];
      }
    }
    if (dto.futurePlanning !== undefined) {
      if (Array.isArray(dto.futurePlanning)) {
        updatePayload.futurePlanning = dto.futurePlanning.map((item) => ({
          ...item,
          date: item.date ? new Date(item.date) : undefined,
        }));
      } else {
        updatePayload.futurePlanning = [];
      }
    }
    if (dto.monthOne !== undefined) {
      updatePayload.monthOne = dto.monthOne;
    }
    if (dto.monthTwo !== undefined) {
      updatePayload.monthTwo = dto.monthTwo;
    }
    if (dto.year !== undefined) {
      updatePayload.year = dto.year;
    }
    if (dto.previousStrengths !== undefined) {
      updatePayload.previousStrengths = dto.previousStrengths;
    }
    if (dto.newStrengths !== undefined) {
      updatePayload.newStrengths = dto.newStrengths;
    }
    if (dto.newInterests !== undefined) {
      updatePayload.newInterests = dto.newInterests;
    }
    if (dto.goalEvaluations !== undefined) {
      if (Array.isArray(dto.goalEvaluations)) {
        updatePayload.goalEvaluations = dto.goalEvaluations.map((item) => {
          const completeValue = item.complete === true || String(item.complete || '').toLowerCase() === 'true';
          return {
            goalEvaluationsId: item.goalEvaluationsId || uuidv4(),
            goal: item.goal || '',
            evaluation: item.evaluation || '',
            complete: completeValue,
          };
        });
      } else {
        updatePayload.goalEvaluations = [];
      }
    }
    if (dto.newGoals !== undefined) {
      updatePayload.newGoals = dto.newGoals;
      const newGoalsAsEvaluations = Array.isArray(dto.newGoals)
        ? dto.newGoals.map((goalText) => ({
            goalEvaluationsId: uuidv4(),
            goal: goalText || '',
            evaluation: '',
            complete: false,
          }))
        : [];
      if (updatePayload.goalEvaluations && Array.isArray(updatePayload.goalEvaluations)) {
        updatePayload.goalEvaluations = [...updatePayload.goalEvaluations, ...newGoalsAsEvaluations];
      } else {
        updatePayload.goalEvaluations = newGoalsAsEvaluations;
      }
    }
    if (dto.allowComments !== undefined) {
      updatePayload.allowComments = dto.allowComments;
    }
    if (dto.allowTrackbacks !== undefined) {
      updatePayload.allowTrackbacks = dto.allowTrackbacks;
    }
    if (dto.educationalTheorists !== undefined) {
      updatePayload.educationalTheorists = dto.educationalTheorists;
    }
    if (dto.outcomes !== undefined) {
      updatePayload.outcomes = dto.outcomes;
    }
    const updated = await this.learningJourneyModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: updatePayload }, { new: true })
      .select('-newGoals')
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('Learning journey not found');
    }
    if (dto.goalEvaluations !== undefined && Array.isArray(dto.goalEvaluations)) {
      const completedGoalIds = dto.goalEvaluations
        .filter((item) => {
          const completeValue = item.complete === true || String(item.complete || '').toLowerCase() === 'true';
          return completeValue && item.goalEvaluationsId;
        })
        .map((item) => item.goalEvaluationsId);
      if (completedGoalIds.length > 0) {
        const existingJourney = await this.learningJourneyModel.findOne({ _id: id, isDeleted: false }).lean().exec();
        if (existingJourney) {
          const childId = existingJourney.children;
          await this.learningJourneyModel.updateMany(
            {
              children: childId,
              _id: { $ne: id },
              isDeleted: false,
              'goalEvaluations.goalEvaluationsId': { $in: completedGoalIds },
            },
            {
              $set: {
                'goalEvaluations.$[elem].complete': true,
                updatedBy: currentUser._id,
              },
            },
            {
              arrayFilters: [{ 'elem.goalEvaluationsId': { $in: completedGoalIds } }],
            },
          );
        }
      }
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid learning journey ID format');
    }
    const removed = await this.learningJourneyModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('Learning journey not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
        },
      },
      { $sort: { year: -1, month: -1 } },
    ];
    const results = await this.learningJourneyModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }

  async findDailyJournalLearningsByMonth(
    query: LearningJourneyDailyJournalQueryDto,
    currentUser: User,
  ): Promise<{
    individualLearning: { date?: Date; photos?: string[]; learning?: string }[];
  }> {
    if (!query.monthOne || !query.monthTwo) {
      throw new BadRequestException('monthOne and monthTwo are required');
    }
    if (!query.children) {
      throw new BadRequestException('children is required');
    }
    const monthStart = Math.min(query.monthOne, query.monthTwo);
    const monthEnd = Math.max(query.monthOne, query.monthTwo);
    const year = query.year ?? new Date().getFullYear();
    const startDate = new Date(year, monthStart - 1, 1);
    const endDate = new Date(year, monthEnd, 1);
    const filter: Record<string, unknown> = {
      isDeleted: false,
      date: { $gte: startDate, $lt: endDate },
    };
    if (query.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    filter.child = new Types.ObjectId(query.children);
    if (!isAdministrator(currentUser)) {
      if (currentUser.rooms && currentUser.rooms.length > 0) {
        if (!filter.room) {
          filter.room = { $in: currentUser.rooms };
        }
      } else if (currentUser.campuses && currentUser.campuses.length > 0) {
        const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses, 'campus');
        Object.assign(filter, campusFilter);
      } else {
        return { individualLearning: [] };
      }
    }
    const journals = await this.dailyJournalModel
      .find(filter)
      .select('date individualLearning')
      .lean()
      .exec();
    const individualLearning: { date?: Date; photos?: string[]; learning?: string }[] = [];
    journals.forEach((journal: any) => {
      const journalDate: Date | undefined = journal.date;
      if (Array.isArray(journal.individualLearning)) {
        journal.individualLearning.forEach((item: any) => {
          const childrenIds = Array.isArray(item.children)
            ? item.children.map((c: any) => c.toString())
            : [];
          if (!childrenIds.includes(String(query.children))) {
            return;
          }
          individualLearning.push({
            date: journalDate,
            photos: item.photos,
            learning: item.learning,
          });
        });
      }
    });
    return { individualLearning };
  }

  async findPreviousStrength(
    campusId: string,
    roomId: string,
    childId: string,
    currentDate?: string,
  ): Promise<{
    source: 'learningJourney' | 'wellnessPlan' | 'none';
    previousStrength: string | null;
  }> {
    const campusObjectId = new Types.ObjectId(campusId);
    const roomObjectId = new Types.ObjectId(roomId);
    const childObjectId = new Types.ObjectId(childId);
    const dateFilter: Record<string, unknown> = {};
    if (currentDate) {
      const parsed = new Date(currentDate);
      if (!Number.isNaN(parsed.getTime())) {
        dateFilter.date = { $lt: parsed };
      }
    }
    const previousJourney = await this.learningJourneyModel
      .findOne({
        campus: campusObjectId,
        room: roomObjectId,
        children: childObjectId,
        isDeleted: false,
        ...dateFilter,
      })
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();
    if (previousJourney) {
      const fromNewStrengths =
        typeof previousJourney.newStrengths === 'string' && previousJourney.newStrengths.trim()
          ? previousJourney.newStrengths.trim()
          : undefined;
      const fromPreviousStrengths =
        typeof previousJourney.previousStrengths === 'string' &&
        previousJourney.previousStrengths.trim()
          ? previousJourney.previousStrengths.trim()
          : undefined;
      const previousStrength = fromNewStrengths ?? fromPreviousStrengths ?? null;
      return { source: 'learningJourney', previousStrength };
    }
    const wellnessPlan = await this.wellnessPlanModel
      .findOne({
        campus: campusObjectId,
        room: roomObjectId,
        children: childObjectId,
        isDeleted: false,
      })
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();
    if (wellnessPlan && typeof wellnessPlan.childStrengthsObservedAtHome === 'string') {
      const value = wellnessPlan.childStrengthsObservedAtHome.trim();
      if (value) {
        return { source: 'wellnessPlan', previousStrength: value };
      }
    }
    return { source: 'none', previousStrength: null };
  }

  async getPendingGoalsByChild(childId: string): Promise<Array<{
    goalEvaluationsId: string;
    goal: string;
    evaluation: string;
    complete: false;
  }>> {
    if (!Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid child ID format');
    }
    const childObjectId = new Types.ObjectId(childId);
    const allJourneys = await this.learningJourneyModel
      .find({ children: childObjectId, isDeleted: false })
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();
    const goalEvaluationsMap = new Map<string, { goalEvaluationsId: string; goal: string; evaluation: string; complete: false }>();
    const goalTextToIdMap = new Map<string, string>();
    allJourneys.forEach((journey: any) => {
      if (Array.isArray(journey.goalEvaluations)) {
        journey.goalEvaluations.forEach((item: any) => {
          if (item.goal && item.goalEvaluationsId) {
            const normalizedGoal = item.goal.trim().toLowerCase();
            if (!goalTextToIdMap.has(normalizedGoal)) {
              goalTextToIdMap.set(normalizedGoal, item.goalEvaluationsId);
            }
            if (!item.complete && !goalEvaluationsMap.has(item.goalEvaluationsId)) {
              goalEvaluationsMap.set(item.goalEvaluationsId, {
                goalEvaluationsId: item.goalEvaluationsId,
                goal: item.goal.trim(),
                evaluation: item.evaluation || '',
                complete: false as const,
              });
            }
          }
        });
      }
    });
    const newGoalsMap = new Map<string, { goalEvaluationsId: string; goal: string; evaluation: string; complete: false }>();
    allJourneys.forEach((journey: any) => {
      if (Array.isArray(journey.newGoals)) {
        journey.newGoals.forEach((goalText: any) => {
          if (typeof goalText === 'string' && goalText.trim()) {
            const normalizedGoal = goalText.trim().toLowerCase();
            if (!newGoalsMap.has(normalizedGoal) && !goalEvaluationsMap.has(goalTextToIdMap.get(normalizedGoal) || '')) {
              newGoalsMap.set(normalizedGoal, {
                goalEvaluationsId: goalTextToIdMap.get(normalizedGoal) || uuidv4(),
                goal: goalText.trim(),
                evaluation: '',
                complete: false as const,
              });
            }
          }
        });
      }
    });
    return [...goalEvaluationsMap.values(), ...newGoalsMap.values()];
  }

}


