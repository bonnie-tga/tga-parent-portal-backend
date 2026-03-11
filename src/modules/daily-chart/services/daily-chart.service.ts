import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DailyChart, DailyChartStatus, DailyChartMeal, DailyChartTimeSlot } from '../schemas/daily-chart.schema';
import { CreateDailyChartDto } from '../dto/create-daily-chart.dto';
import { QueryDailyChartDto, DailyChartSortOrder } from '../dto/query-daily-chart.dto';
import { UpdateDailyChartDto } from '../dto/update-daily-chart.dto';
import { User } from 'src/modules/users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { compareObjectIds } from '../../../utils/mongoose-helper';
import { WellbeingService } from '../../wellbeing/services/wellbeing.service';

@Injectable()
export class DailyChartService {
  constructor(
    @InjectModel(DailyChart.name) private dailyChartModel: Model<DailyChart>,
    @InjectModel(Child.name) private childModel: Model<Child>,
    private readonly wellbeingService: WellbeingService,
  ) {}

  private getCategoryKey(category?: DailyChartMeal | string | null): string {
    if (category === DailyChartMeal.MORNING_TEA || category === 'morning_tea') return 'morning_tea';
    if (category === DailyChartMeal.LUNCH || category === 'lunch') return 'lunch';
    if (category === DailyChartMeal.AFTERNOON_TEA || category === 'afternoon_tea') return 'afternoon_tea';
    if (category === DailyChartMeal.CRUNCH_AND_SIP || category === 'crunch_and_sip') return 'crunch_and_sip';
    return 'morning_tea';
  }

  private buildChecklistFromCategory(category?: DailyChartMeal | string | null) {
    if (!category) return null;
    const checklist: any = {};
    const categoryKey = this.getCategoryKey(category);
    if (categoryKey === 'morning_tea') checklist.morning = 'done';
    else if (categoryKey === 'lunch') checklist.lunch = 'done';
    else if (categoryKey === 'afternoon_tea') checklist.afternoon = 'done';
    else if (categoryKey === 'crunch_and_sip') checklist.crunchAndSip = 'done';
    else return null;
    return checklist;
  }

  private isDailyChartItemFilledForChecklist(item: any): boolean {
    if (!item) {
      return false;
    }
    if (item.tea_lunch) {
      return true;
    }
    if (item.fruit_quantity) {
      return true;
    }
    if (item.water_options) {
      return true;
    }
    if (typeof item.comments === 'string' && item.comments.trim().length > 0) {
      return true;
    }
    if (Array.isArray(item.bottles) && item.bottles.length > 0) {
      return item.bottles.some((bottle: any) => {
        const hasAmount = Array.isArray(bottle.amount) && bottle.amount.length > 0;
        const hasTime = typeof bottle.time === 'string' && bottle.time.trim().length > 0;
        return hasAmount || hasTime;
      });
    }
    return false;
  }

  private areAllChildrenCoveredForCategory(
    children: (Types.ObjectId | string)[],
    items: { child?: Types.ObjectId | string }[] | undefined,
  ): boolean {
    if (!children || children.length === 0) {
      return false;
    }
    const itemChildIds = new Set<string>();
    (items || []).forEach((item) => {
      if (!item || !item.child) {
        return;
      }
      if (!this.isDailyChartItemFilledForChecklist(item)) {
        return;
      }
      itemChildIds.add(String(item.child));
    });
    return children.every((child) => itemChildIds.has(String(child)));
  }

  private extractChildId(child: any): string {
    if (child instanceof Types.ObjectId) return child.toString();
    if (child?._id) {
      const id = child._id instanceof Types.ObjectId ? child._id : new Types.ObjectId(String(child._id));
      return id.toString();
    }
    return String(child);
  }

  private mapDailyChartItem(item: any) {
    return {
      child: item.child ? new Types.ObjectId(item.child) : undefined,
      tea_lunch: item.tea_lunch,
      fruit_quantity: item.fruit_quantity,
      water_options: item.water_options,
      comments: item.comments,
      bottles: item.bottles || [],
    };
  }

  private async publishDueScheduled(): Promise<void> {
    const now = new Date();
    const due = await this.dailyChartModel
      .find({
        isDeleted: false,
        scheduleAt: { $lte: now },
        status: { $ne: DailyChartStatus.PUBLISHED },
      })
      .select('_id scheduleAt publishedAt createdBy updatedBy campus')
      .lean()
      .exec();

    if (!due || due.length === 0) return;

    const updatesById = new Map<string, { userRef?: any }>();
    const ops = due.map((d: any) => {
      const publishedAt = d.publishedAt ? new Date(d.publishedAt) : new Date(d.scheduleAt);
      const userRef = d.updatedBy || d.createdBy || null;
      const updateDoc: Record<string, any> = {
        status: DailyChartStatus.PUBLISHED,
        publishedAt,
      };
      if (userRef) {
        updateDoc.updatedBy = userRef;
      }
      updatesById.set(String(d._id), { userRef });
      return {
        updateOne: {
          filter: { _id: d._id },
          update: {
            $set: updateDoc,
          },
        },
      };
    });

    await this.dailyChartModel.bulkWrite(ops);

    const publishedIds = due.map((d: any) => d._id);
    const publishedCharts = await this.dailyChartModel
      .find({ _id: { $in: publishedIds } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .lean()
      .exec();

    await Promise.all(
      publishedCharts.map(async (chart: any) => {
        const meta = updatesById.get(String(chart._id));
        const userCandidate =
          (chart.updatedBy && (chart.updatedBy._id || chart.updatedBy)) ||
          (chart.createdBy && (chart.createdBy._id || chart.createdBy)) ||
          meta?.userRef;

        if (!userCandidate) return;

        try {
          await this.syncWellbeingEntriesForChildren(chart as DailyChart, String(userCandidate));
          // await this.feedOrchestrator.process({
          //   options: { type: 'daily-chart', action: 'update' },
          //   result: chart,
          //   userId: String(userCandidate),
          //   method: 'PATCH',
          // });
        } catch (error) {
          // We do not want feed sync failures to block schedule promotion
          console.error('[DailyChart] feed sync failed during scheduled publish:', error);
        }
      }),
    );
  }

  async create(createDailyChartDto: CreateDailyChartDto, currentUser: User): Promise<DailyChart> {
    // Access control for non-admins: must have room or campus access
    if (!isAdministrator(currentUser)) {
      const hasRoomScope = Array.isArray(currentUser.rooms) && currentUser.rooms.length > 0;
      if (hasRoomScope) {
        const allowed = (currentUser.rooms || []).some((r) => String(r) === String(createDailyChartDto.room));
        if (!allowed) throw new ForbiddenException('You do not have permission to create for this room');
      } else {
        const allowedCampus = (currentUser.campuses || []).some((c) => String(c) === String(createDailyChartDto.campus));
        if (!allowedCampus) throw new ForbiddenException('You do not have permission to create for this campus');
      }
    }

    const payload: any = {
      date: new Date(createDailyChartDto.date),
      campus: new Types.ObjectId(createDailyChartDto.campus),
      room: new Types.ObjectId(createDailyChartDto.room),
      children: Array.isArray(createDailyChartDto.children)
        ? createDailyChartDto.children.map((id) => new Types.ObjectId(id))
        : undefined,
      morningTea: createDailyChartDto.morningTea,
      lunch: createDailyChartDto.lunch,
      afternoonTea: createDailyChartDto.afternoonTea,
      category: createDailyChartDto.category,
      childrenBottles: (createDailyChartDto.childrenBottles || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        bottles: (entry.bottles || []).map((b) => ({
          amount: b.amount,
          time: b.time,
        })),
      })),
      createdBy: (currentUser as any)._id,
      author: (currentUser as any)._id,
    };

    if (createDailyChartDto.dailyChartItems) {
      const categoryItems: any = {};
      const categories = ['morning_tea', 'lunch', 'afternoon_tea', 'crunch_and_sip'];
      
      if (Array.isArray(createDailyChartDto.dailyChartItems)) {
        const categoryKey = this.getCategoryKey(createDailyChartDto.category);
        categoryItems[categoryKey] = createDailyChartDto.dailyChartItems.map(this.mapDailyChartItem);
      } else {
        categories.forEach((key) => {
          if (createDailyChartDto.dailyChartItems[key]) {
            categoryItems[key] = createDailyChartDto.dailyChartItems[key].map(this.mapDailyChartItem);
          }
        });
      }
      
      payload.dailyChartItems = categoryItems;
    }

    if (createDailyChartDto.visibility) {
      payload.visibility = createDailyChartDto.visibility as any;
    }

    if (createDailyChartDto.category) {
      const categoryKey = this.getCategoryKey(createDailyChartDto.category);
      const itemsForCategory =
        (payload.dailyChartItems && (payload.dailyChartItems as any)[categoryKey]) || [];
      const allChildrenCovered = this.areAllChildrenCoveredForCategory(payload.children, itemsForCategory);
      if (allChildrenCovered) {
        const checklist = this.buildChecklistFromCategory(createDailyChartDto.category);
        if (checklist) {
          payload.dailyChartChecklist = checklist;
        }
      }

      if (createDailyChartDto.category === DailyChartMeal.MORNING_TEA) {
        payload.time = DailyChartTimeSlot.morning;
      } else if (createDailyChartDto.category === DailyChartMeal.LUNCH) {
        payload.time = DailyChartTimeSlot.lunch;
      } else if (createDailyChartDto.category === DailyChartMeal.AFTERNOON_TEA) {
        payload.time = DailyChartTimeSlot.afternoon;
      }
    }

    const now = Date.now();
    let status: DailyChartStatus = (createDailyChartDto.status as DailyChartStatus) ?? DailyChartStatus.DRAFT;
    let publishedAt: Date | null = null;
    let scheduleAt: Date | undefined;

    if (createDailyChartDto.scheduleAt) {
      const scheduleDate = new Date(createDailyChartDto.scheduleAt);
      scheduleAt = scheduleDate;
      if (scheduleDate.getTime() <= now) {
        status = DailyChartStatus.PUBLISHED;
        publishedAt = scheduleDate;
      } else {
        status = DailyChartStatus.SCHEDULED;
      }
    } else if (status === DailyChartStatus.PUBLISHED) {
      publishedAt = new Date();
    }

    if (scheduleAt !== undefined) {
      payload.scheduleAt = scheduleAt;
    }

    payload.status = status;
    payload.publishedAt = status === DailyChartStatus.PUBLISHED ? publishedAt : null;

    const created = await this.dailyChartModel.create(payload);
    
    const populated = await this.dailyChartModel
      .findById(created._id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('dailyChartItems.morning_tea.child', 'fullName')
      .populate('dailyChartItems.lunch.child', 'fullName')
      .populate('dailyChartItems.afternoon_tea.child', 'fullName')
      .populate('dailyChartItems.crunch_and_sip.child', 'fullName')
      .populate('childrenBottles.child', 'fullName')
      .exec();
    
    if (populated && populated.status === DailyChartStatus.PUBLISHED) {
      try {
        await this.syncWellbeingEntriesForChildren(populated, (currentUser as any)._id?.toString() || '');
      } catch (error) {
        console.error(`[DailyChart] Failed to sync wellbeing entries during daily chart creation:`, error);
        throw error;
      }
    }
    
    return populated || created;
  }

  async findAll(query: QueryDailyChartDto, currentUser: User): Promise<DailyChart[]> {
    await this.publishDueScheduled();

    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const search = query.search;
    const sortBy = query.sortBy ?? 'lastModified';
    const sortOrderValue = query.sortOrder ?? DailyChartSortOrder.DESC;
    const sortDirection = sortOrderValue === DailyChartSortOrder.ASC ? 1 : -1;

    const filters: any = { isDeleted: query.isDeleted ?? false };

    if (query.campus) filters.campus = new Types.ObjectId(query.campus);
    if (query.room) filters.room = new Types.ObjectId(query.room);
    if (query.child) filters.children = new Types.ObjectId(query.child);
    if (query.status) filters.status = query.status;
    if (query.date) {
      const dateObj = new Date(query.date);
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      filters.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      filters.$or = [
        { morningTea: regex },
        { lunch: regex },
        { afternoonTea: regex },
        { category: regex },
      ];
    }

    // Access control
    if (!isAdministrator(currentUser)) {
      if (currentUser.rooms && currentUser.rooms.length > 0) {
        if (!filters.room) {
          filters.room = { $in: currentUser.rooms as any };
        }
      } else if (currentUser.campuses && currentUser.campuses.length > 0) {
        const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses as any, 'campus');
        Object.assign(filters, campusFilter);
      } else {
        return [];
      }
    }

    const sortField = sortBy === 'lastModified' ? 'updatedAt' : sortBy;

    return this.dailyChartModel
      .find(filters)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('dailyChartItems.morning_tea.child', 'fullName')
      .populate('dailyChartItems.lunch.child', 'fullName')
      .populate('dailyChartItems.afternoon_tea.child', 'fullName')
      .populate('dailyChartItems.crunch_and_sip.child', 'fullName')
      .populate('childrenBottles.child', 'fullName')
      .exec();
  }

  async findOne(id: string, currentUser: User): Promise<DailyChart> {
    await this.publishDueScheduled();

    const dailyChart = await this.dailyChartModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('dailyChartItems.morning_tea.child', 'fullName')
      .populate('dailyChartItems.lunch.child', 'fullName')
      .populate('dailyChartItems.afternoon_tea.child', 'fullName')
      .populate('dailyChartItems.crunch_and_sip.child', 'fullName')
      .populate('childrenBottles.child', 'fullName')
      .exec();
    if (!dailyChart) throw new NotFoundException(`Daily chart with ID '${id}' not found`);

    if (!isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (dailyChart as any).room as any));
      const hasCampusAccess =
        currentUser.campuses &&
        currentUser.campuses.some((c) => compareObjectIds(c as any, (dailyChart as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this daily chart');
      }
    }

    return dailyChart;
  }

  async update(id: string, updateDailyChartDto: UpdateDailyChartDto, currentUser: User): Promise<DailyChart> {
    const existing = await this.dailyChartModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException(`Daily chart with ID '${id}' not found`);

    if (!isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses &&
        currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to update this daily chart');
      }
    }

    const update: any = {
      updatedBy: (currentUser as any)._id,
    };
    if (updateDailyChartDto.date != null) update.date = new Date(updateDailyChartDto.date as any);
    if (updateDailyChartDto.campus != null) update.campus = new Types.ObjectId(updateDailyChartDto.campus as any);
    if (updateDailyChartDto.room != null) update.room = new Types.ObjectId(updateDailyChartDto.room as any);
    if (updateDailyChartDto.children != null) {
      update.children = (updateDailyChartDto.children || []).map((id) => new Types.ObjectId(id));
    }
    if (updateDailyChartDto.morningTea !== undefined) update.morningTea = updateDailyChartDto.morningTea;
    if (updateDailyChartDto.lunch !== undefined) update.lunch = updateDailyChartDto.lunch;
    if (updateDailyChartDto.afternoonTea !== undefined) update.afternoonTea = updateDailyChartDto.afternoonTea;
    if (updateDailyChartDto.childrenBottles != null) {
      update.childrenBottles = (updateDailyChartDto.childrenBottles || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        bottles: (entry.bottles || []).map((b) => ({
          amount: b.amount,
          time: b.time,
        })),
      }));
    }
    if (updateDailyChartDto.dailyChartItems !== undefined) {
      const categoryItems: any = {};
      const existingItems: any = existing.dailyChartItems || {};
      const categories = ['morning_tea', 'lunch', 'afternoon_tea', 'crunch_and_sip'];
      
      if (Array.isArray(updateDailyChartDto.dailyChartItems)) {
        const categoryKey = this.getCategoryKey(updateDailyChartDto.category || existing.category);
        categoryItems[categoryKey] = updateDailyChartDto.dailyChartItems.map(this.mapDailyChartItem);
        categories.forEach((key) => {
          if (key !== categoryKey) categoryItems[key] = existingItems[key] || [];
        });
      } else {
        categories.forEach((key) => {
          if (updateDailyChartDto.dailyChartItems[key] !== undefined) {
            categoryItems[key] = updateDailyChartDto.dailyChartItems[key].map(this.mapDailyChartItem);
          } else {
            categoryItems[key] = existingItems[key] || [];
          }
        });
      }
      
      update.dailyChartItems = categoryItems;
    }

    if (updateDailyChartDto.category !== undefined) {
      update.category = updateDailyChartDto.category as any;

      const effectiveChildren =
        updateDailyChartDto.children && updateDailyChartDto.children.length > 0
          ? updateDailyChartDto.children
          : (existing.children as any[]);

      const effectiveDailyChartItems =
        (update.dailyChartItems as any) ?? (existing.dailyChartItems as any) ?? {};

      const categoryKey = this.getCategoryKey(updateDailyChartDto.category || existing.category);
      const itemsForCategory = effectiveDailyChartItems[categoryKey] || [];
      const allChildrenCovered = this.areAllChildrenCoveredForCategory(effectiveChildren, itemsForCategory);

      if (allChildrenCovered) {
        const newChecklistEntry = this.buildChecklistFromCategory(updateDailyChartDto.category as any);
        if (newChecklistEntry) {
          const existingChecklistObj: any = existing.dailyChartChecklist
            ? JSON.parse(JSON.stringify(existing.dailyChartChecklist))
            : {};
          update.dailyChartChecklist = {
            morning: existingChecklistObj.morning,
            lunch: existingChecklistObj.lunch,
            afternoon: existingChecklistObj.afternoon,
            crunchAndSip: existingChecklistObj.crunchAndSip,
            ...newChecklistEntry,
          };
        }
      } else if (updateDailyChartDto.category === null) {
        update.dailyChartChecklist = existing.dailyChartChecklist || {};
      }

      if (updateDailyChartDto.category === DailyChartMeal.MORNING_TEA) {
        update.time = DailyChartTimeSlot.morning;
      } else if (updateDailyChartDto.category === DailyChartMeal.LUNCH) {
        update.time = DailyChartTimeSlot.lunch;
      } else if (updateDailyChartDto.category === DailyChartMeal.AFTERNOON_TEA) {
        update.time = DailyChartTimeSlot.afternoon;
      }
    }
    if ((updateDailyChartDto as any).visibility !== undefined) {
      update.visibility = (updateDailyChartDto as any).visibility;
    }

    const now = Date.now();
    const scheduleAtProvided = Object.prototype.hasOwnProperty.call(updateDailyChartDto as any, 'scheduleAt');
    const statusProvided = updateDailyChartDto.status !== undefined;
    const publishedAtProvided = Object.prototype.hasOwnProperty.call(updateDailyChartDto as any, 'publishedAt');

    let finalStatus = existing.status as DailyChartStatus;
    let scheduleAtValue: Date | null | undefined;
    let publishedAtValue: Date | null | undefined;

    if (scheduleAtProvided) {
      const scheduleValue = (updateDailyChartDto as any).scheduleAt;
      if (scheduleValue) {
        const scheduleDate = new Date(scheduleValue);
        scheduleAtValue = scheduleDate;
        if (scheduleDate.getTime() <= now) {
          finalStatus = DailyChartStatus.PUBLISHED;
          publishedAtValue = scheduleDate;
        } else {
          finalStatus = DailyChartStatus.SCHEDULED;
          publishedAtValue = null;
        }
      } else {
        scheduleAtValue = null;
        finalStatus = DailyChartStatus.DRAFT;
        publishedAtValue = null;
      }
    }

    if (statusProvided) {
      finalStatus = updateDailyChartDto.status as DailyChartStatus;
      if (!publishedAtProvided) {
        if (finalStatus === DailyChartStatus.PUBLISHED) {
          publishedAtValue = publishedAtValue ?? new Date();
        } else {
          publishedAtValue = null;
        }
      }
    }

    if (publishedAtProvided) {
      const provided = (updateDailyChartDto as any).publishedAt;
      publishedAtValue = provided ? new Date(provided) : null;
    }

    if (scheduleAtValue !== undefined) {
      update.scheduleAt = scheduleAtValue;
    }

    if (statusProvided || scheduleAtProvided) {
      update.status = finalStatus;
    }

    if (publishedAtValue !== undefined) {
      update.publishedAt = finalStatus === DailyChartStatus.PUBLISHED ? publishedAtValue : null;
    } else if ((statusProvided || scheduleAtProvided) && finalStatus !== DailyChartStatus.PUBLISHED) {
      update.publishedAt = null;
    }

    const updated = await this.dailyChartModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true },
    );
    if (!updated) throw new NotFoundException(`Daily chart with ID '${id}' not found`);
    
    if (updated.status === DailyChartStatus.PUBLISHED) {
      const existingChildIds = (existing.children || []).map((c: any) => this.extractChildId(c));
      const updatedChildIds = (updated.children || []).map((c: any) => this.extractChildId(c));
      
      const removedChildIds = existingChildIds.filter(id => !updatedChildIds.includes(id));
      const addedOrUpdatedChildIds = updatedChildIds;
      
      const hasGeneralDataChange = 
        updateDailyChartDto.morningTea !== undefined ||
        updateDailyChartDto.lunch !== undefined ||
        updateDailyChartDto.afternoonTea !== undefined ||
        updateDailyChartDto.category !== undefined ||
        updateDailyChartDto.date != null;
      
      const childSpecificChanges = this.getChildSpecificChanges(existing, updateDailyChartDto);
      
      if (removedChildIds.length > 0) {
        await this.deleteWellbeingEntriesForChildren(id, removedChildIds);
      }
      
      if (hasGeneralDataChange) {
        await this.syncWellbeingEntriesForChildren(updated, (currentUser as any)._id?.toString() || '', addedOrUpdatedChildIds);
      } else if (childSpecificChanges.length > 0) {
        await this.syncWellbeingEntriesForChildren(updated, (currentUser as any)._id?.toString() || '', childSpecificChanges);
      } else if (updateDailyChartDto.children != null) {
        await this.syncWellbeingEntriesForChildren(updated, (currentUser as any)._id?.toString() || '', addedOrUpdatedChildIds);
      }
    } else {
      await this.deleteWellbeingEntries(id);
    }
    
    return updated;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const existing = await this.dailyChartModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException(`Daily chart with ID '${id}' not found`);
    if (!isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses &&
        currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to hard delete this daily chart');
      }
    }
    await this.dailyChartModel.findOneAndDelete({ _id: id }).exec();
    await this.deleteWellbeingEntries(id);
  }

  async softDelete(id: string, currentUser: User): Promise<DailyChart> {
    const existing = await this.dailyChartModel.findOne({ _id: id }).exec();
    if (!existing) throw new NotFoundException(`Daily chart with ID '${id}' not found`);
    if (!isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses &&
        currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to delete this daily chart');
      }
    }
    const updated = await this.dailyChartModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, updatedBy: (currentUser as any)._id },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Daily chart with ID '${id}' not found`);
    
    await this.deleteWellbeingEntries(id);
    
    return updated;
  }

  async restore(id: string, currentUser: User): Promise<void> {
    const existing = await this.dailyChartModel.findOne({ _id: id }).exec();
    if (!existing) throw new NotFoundException(`Daily chart with ID '${id}' not found`);
    if (!isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses &&
        currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to restore this daily chart');
      }
    }
    await this.dailyChartModel.findByIdAndUpdate(id, { isDeleted: false, updatedBy: (currentUser as any)._id }).exec();
  }

  async getChildrenByDate(date: string, roomId?: string, campusId?: string, currentUser?: User): Promise<any[]> {
    await this.publishDueScheduled();

    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const filters: any = {
      isDeleted: false,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    if (roomId) {
      filters.room = new Types.ObjectId(roomId);
    }

    if (campusId) {
      filters.campus = new Types.ObjectId(campusId);
    }

    // Access control
    if (currentUser && !isAdministrator(currentUser)) {
      if (currentUser.rooms && currentUser.rooms.length > 0) {
        if (!roomId) {
          filters.room = { $in: currentUser.rooms as any };
        } else {
          // Check if user has access to the requested room
          const hasRoomAccess = currentUser.rooms.some((r) => compareObjectIds(r as any, new Types.ObjectId(roomId)));
          if (!hasRoomAccess) {
            throw new ForbiddenException('You do not have access to this room');
          }
        }
      } else if (currentUser.campuses && currentUser.campuses.length > 0) {
        if (!campusId) {
          const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses as any, 'campus');
          Object.assign(filters, campusFilter);
        } else {
          // Check if user has access to the requested campus
          const hasCampusAccess = currentUser.campuses.some((c) => compareObjectIds(c as any, new Types.ObjectId(campusId)));
          if (!hasCampusAccess) {
            throw new ForbiddenException('You do not have access to this campus');
          }
        }
      } else {
        return [];
      }
    }

    const dailyCharts = await this.dailyChartModel
      .find(filters)
      .select('children')
      .lean()
      .exec();

    // Extract unique child IDs from all daily charts for the date
    const childIdsSet = new Set<string>();
    dailyCharts.forEach((chart: any) => {
      if (chart.children && Array.isArray(chart.children)) {
        chart.children.forEach((childId: any) => {
          if (childId) {
            // Handle both ObjectId and populated object cases
            const id = childId._id ? String(childId._id) : String(childId);
            if (id && Types.ObjectId.isValid(id)) {
              childIdsSet.add(id);
            }
          }
        });
      }
    });

    if (childIdsSet.size === 0) {
      return [];
    }

    // Fetch children from child table to get noConcent value (verify consent, don't filter)
    // Also verify room/campus for extra safety
    const childIdsArray = Array.from(childIdsSet).map((id) => new Types.ObjectId(id));
    const childFilters: any = {
      _id: { $in: childIdsArray },
    };

    // Add room filter if provided (for extra safety)
    if (roomId) {
      childFilters.room = new Types.ObjectId(roomId);
    }

    // Add campus filter if provided (for extra safety)
    if (campusId) {
      childFilters.campus = new Types.ObjectId(campusId);
    }

    const children = await this.childModel
      .find(childFilters)
      .select('fullName profileImage noConcent')
      .lean()
      .exec();

    return children.map((child: any) => ({
      _id: child._id,
      fullName: child.fullName,
      profileImage: child.profileImage,
      noConcent: child.noConcent || false, // Include noConcent field in response
    }));
  }

  private async syncWellbeingEntriesForChildren(
    dailyChart: DailyChart, 
    authorId: string, 
    childIds?: string[]
  ): Promise<void> {
    if (!dailyChart.children || dailyChart.children.length === 0) return;
    if (!authorId) return;

    const payload = this.buildPayload(dailyChart);
    const refId = dailyChart._id.toString();
    
    // Extract campus ID - handle both ObjectId and populated object
    let campusId: string = '';
    if (dailyChart.campus instanceof Types.ObjectId) {
      campusId = dailyChart.campus.toString();
    } else if (dailyChart.campus && typeof dailyChart.campus === 'object') {
      // Populated object case
      const campusObj = dailyChart.campus as any;
      if (campusObj._id) {
        campusId = campusObj._id instanceof Types.ObjectId 
          ? campusObj._id.toString() 
          : String(campusObj._id);
      } else {
        campusId = String(campusObj);
      }
    } else if (dailyChart.campus) {
      campusId = String(dailyChart.campus);
    }

    const childrenToSync = childIds || dailyChart.children.map((c: any) => this.extractChildId(c));

    // Sync category entries (morning_tea, lunch, afternoon_tea, crunch_and_sip)
    await Promise.all(
      childrenToSync.map(async (childIdString: string) => {
        const childInChart = dailyChart.children?.some((c: any) => 
          this.extractChildId(c) === childIdString
        );
        
        if (!childInChart) return;

        const childSpecificPayload = this.buildPayload(dailyChart, childIdString);
        const category = dailyChart.category || childSpecificPayload.category;

        try {
          // Find existing wellbeing entry by refId + childId + category
          // This ensures we update only if same child, same category, same refId
          const existing = await this.wellbeingService.findByRefIdAndChildAndCategory(
            refId,
            childIdString,
            'daily-chart',
            category,
          );

          if (existing) {
            // Same child + same category + same refId → UPDATE
            await this.wellbeingService.update(
              existing._id.toString(),
              childSpecificPayload,
              'Daily chart published',
            );
          } else {
            // Different category OR different refId OR new entry → CREATE NEW
            await this.wellbeingService.create(
              'daily-chart',
              refId,
              childIdString,
              childSpecificPayload,
              authorId,
              campusId ? [campusId] : [],
              'Daily chart published',
            );
          }
        } catch (error) {
          console.error(`Failed to sync wellbeing entry for child ${childIdString}:`, error);
          throw error;
        }
      }),
    );

    // Sync childrenBottles separately (one entry per child per DailyChart)
    await this.syncChildrenBottles(dailyChart, authorId, campusId, childrenToSync);
  }

  private async syncChildrenBottles(
    dailyChart: DailyChart,
    authorId: string,
    campusId: string,
    childIds: string[]
  ): Promise<void> {
    if (!dailyChart.childrenBottles || !Array.isArray(dailyChart.childrenBottles) || dailyChart.childrenBottles.length === 0) {
      return; // No childrenBottles to sync
    }

    const refId = dailyChart._id.toString();

    await Promise.all(
      childIds.map(async (childIdString: string) => {
        // Find the child's bottles entry from dailyChart.childrenBottles
        const childBottleEntry = dailyChart.childrenBottles.find((entry: any) => {
          if (!entry || !entry.child) return false;
          const entryChildId = this.extractChildId(entry.child);
          return String(entryChildId).trim() === String(childIdString).trim();
        });

        if (!childBottleEntry) return; // No bottles for this child

        // Prepare childrenBottles payload (only this child's entry)
        let childValue: any = childBottleEntry.child;
        if (childValue && typeof childValue === 'object' && !(childValue instanceof Types.ObjectId)) {
          childValue = childValue._id || childValue;
        }

        const childrenBottlesPayload = {
          status: dailyChart.status,
          date: dailyChart.date ? dailyChart.date.toISOString() : null,
          childrenBottles: [{
            child: childValue,
            bottles: Array.isArray(childBottleEntry.bottles) ? childBottleEntry.bottles : [],
          }],
          publishedAt: dailyChart.publishedAt ? dailyChart.publishedAt.toISOString() : null,
        };

        try {
          // Find all wellbeing entries for this refId + childId
          const allEntries = await this.wellbeingService.findByRefId(refId, 'daily-chart');
          
          // Find the childrenBottles entry (has childrenBottles in payload, no category or category is null)
          const childrenBottlesEntry = allEntries.find((entry: any) => {
            if (!entry || entry.childId?.toString() !== childIdString) return false;
            const payload = entry.payload || {};
            // childrenBottles entry: has childrenBottles AND (no category OR category is null)
            return payload.childrenBottles && (!payload.category || payload.category === null);
          });

          if (childrenBottlesEntry) {
            // Compare old vs new bottles
            const oldBottles = childrenBottlesEntry.payload?.childrenBottles || [];
            const newBottles = childrenBottlesPayload.childrenBottles || [];
            
            const oldBottlesStr = JSON.stringify(oldBottles);
            const newBottlesStr = JSON.stringify(newBottles);

            if (oldBottlesStr !== newBottlesStr) {
              // Bottles changed → UPDATE
              await this.wellbeingService.update(
                childrenBottlesEntry._id.toString(),
                childrenBottlesPayload,
                'Daily chart childrenBottles updated',
              );
            }
            // If same → do nothing
          } else {
            // No childrenBottles entry exists → CREATE ONCE
            await this.wellbeingService.create(
              'daily-chart',
              refId,
              childIdString,
              childrenBottlesPayload,
              authorId,
              campusId ? [campusId] : [],
              'Daily chart childrenBottles published',
            );
          }
        } catch (error) {
          console.error(`Failed to sync childrenBottles for child ${childIdString}:`, error);
          // Don't throw - childrenBottles sync failure shouldn't block category sync
        }
      }),
    );
  }

  private buildPayload(dailyChart: DailyChart, childId?: string): any {
    let dailyChartItems: any = dailyChart.dailyChartItems || null;
    const categoryKey = this.getCategoryKey(dailyChart.category);

    if (childId) {
      if (dailyChartItems) {
        const itemsObj = dailyChartItems as any;
        if (Array.isArray(itemsObj)) {
          dailyChartItems = itemsObj.filter((item: any) => 
            item.child && this.extractChildId(item.child) === childId
          );
        } else if (typeof itemsObj === 'object' && itemsObj !== null) {
          const categoryItems = itemsObj[categoryKey] || [];
          dailyChartItems = categoryItems.filter((item: any) => 
            item.child && this.extractChildId(item.child) === childId
          );
        }
      }
    } else {
      if (dailyChartItems && typeof dailyChartItems === 'object' && !Array.isArray(dailyChartItems)) {
        dailyChartItems = (dailyChartItems as any)[categoryKey] || [];
      }
    }

    // Category sync: Save only category + dailyChartItems
    // childrenBottles is NOT included in category entries (handled separately)
    return {
      status: dailyChart.status,
      date: dailyChart.date ? dailyChart.date.toISOString() : null,
      category: dailyChart.category || null,
      time: dailyChart.time || null,
      dailyChartItems: dailyChartItems,
      publishedAt: dailyChart.publishedAt ? dailyChart.publishedAt.toISOString() : null,
    };
  }

  private async deleteWellbeingEntries(dailyChartId: string): Promise<void> {
    try {
      const entries = await this.wellbeingService.findByRefId(dailyChartId, 'daily-chart');
      await Promise.all(entries.map((entry) => this.wellbeingService.remove(entry._id.toString())));
    } catch (error) {
      console.error('Failed to delete wellbeing entries for daily chart:', error);
    }
  }

  private async deleteWellbeingEntriesForChildren(dailyChartId: string, childIds: string[]): Promise<void> {
    try {
      await Promise.all(
        childIds.map(async (childId) => {
          const entry = await this.wellbeingService.findByRefIdAndChild(
            dailyChartId,
            childId,
            'daily-chart',
          );
          if (entry) {
            await this.wellbeingService.remove(entry._id.toString());
          }
        }),
      );
    } catch (error) {
      console.error('Failed to delete wellbeing entries for specific children:', error);
    }
  }

  private getChildSpecificChanges(
    existing: DailyChart,
    updateDto: UpdateDailyChartDto,
  ): string[] {
    const changedChildIds: string[] = [];

    if (updateDto.dailyChartItems !== undefined) {
      const categoryKey = this.getCategoryKey(updateDto.category || existing.category);
      const existingItems: any[] = Array.isArray(existing.dailyChartItems)
        ? existing.dailyChartItems
        : (existing.dailyChartItems && typeof existing.dailyChartItems === 'object' 
            ? (existing.dailyChartItems as any)[categoryKey] || []
            : []);

      const updateItems = updateDto.dailyChartItems as any;
      const newItems: any[] = Array.isArray(updateItems)
        ? updateItems
        : (typeof updateItems === 'object' && updateItems
            ? (updateItems.morning_tea || updateItems.lunch || updateItems.afternoon_tea || updateItems.crunch_and_sip || updateItems[categoryKey] || [])
            : []);

      const existingItemChildIds = new Set(
        existingItems.filter((item: any) => item.child).map((item: any) => this.extractChildId(item.child))
      );

      const newItemChildIds = new Set(
        newItems.filter((item: any) => item.child).map((item: any) => String(item.child))
      );

      newItemChildIds.forEach((childId: string) => {
        if (!existingItemChildIds.has(childId)) {
          changedChildIds.push(childId);
        }
      });

      const existingMap = new Map(
        existingItems.filter((item: any) => item.child).map((item: any) => [
          this.extractChildId(item.child),
          JSON.stringify({
            tea_lunch: item.tea_lunch,
            fruit_quantity: item.fruit_quantity,
            water_options: item.water_options,
            comments: item.comments,
            bottles: item.bottles || [],
          }),
        ])
      );

      newItems.forEach((newItem: any) => {
        if (!newItem.child) return;
        const childId = String(newItem.child);
        const newItemStr = JSON.stringify({
          tea_lunch: newItem.tea_lunch,
          fruit_quantity: newItem.fruit_quantity,
          water_options: newItem.water_options,
          comments: newItem.comments,
          bottles: newItem.bottles || [],
        });
        if (existingMap.get(childId) !== newItemStr) {
          changedChildIds.push(childId);
        }
      });
    }

    if (updateDto.childrenBottles != null) {
      const existingBottleChildIds = new Set(
        (existing.childrenBottles || [])
          .filter((entry: any) => entry.child)
          .map((entry: any) => this.extractChildId(entry.child))
      );

      const newBottleChildIds = new Set(
        (updateDto.childrenBottles || [])
          .filter((entry: any) => entry.child)
          .map((entry: any) => String(entry.child))
      );

      newBottleChildIds.forEach((childId) => {
        if (!existingBottleChildIds.has(childId)) {
          changedChildIds.push(childId);
        }
      });

      const existingBottleMap = new Map(
        (existing.childrenBottles || [])
          .filter((entry: any) => entry.child)
          .map((entry: any) => [
            this.extractChildId(entry.child),
            JSON.stringify(entry.bottles || []),
          ])
      );

      (updateDto.childrenBottles || []).forEach((newEntry: any) => {
        if (!newEntry.child) return;
        const childId = String(newEntry.child);
        const newBottlesStr = JSON.stringify(newEntry.bottles || []);
        if (existingBottleMap.get(childId) !== newBottlesStr) {
          changedChildIds.push(childId);
        }
      });
    }

    return [...new Set(changedChildIds)];
  }

}