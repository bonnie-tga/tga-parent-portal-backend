import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SleepTimer, sleepTimerStatus } from '../schemas/sleep-timer.schema';
import { User } from '../../users/schemas/user.schema';
import { CreateSleepTimerDto } from '../dto/create-sleep-timer.dto';
import { UpdateSleepTimerDto } from '../dto/update-sleep-timer.dto';
import { QuerySleepTimerDto, sleepTimerSortOrder } from '../dto/query-sleep-timer.dto';
import { buildCampusFilter } from '../../../common/access/access-filter.util';
import { WellbeingService } from '../../wellbeing/services/wellbeing.service';
import { getLocalTimestamp } from '../../../common/utils/timezone.util';

export interface PaginatedSleepTimerResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SleepTimerService {
  private readonly logger = new Logger(SleepTimerService.name);

  constructor(
    @InjectModel(SleepTimer.name) private readonly sleepTimerModel: Model<SleepTimer>,
    private readonly wellbeingService: WellbeingService,
  ) {}

  private async checkAndUpdateExpiredSleepTimers(): Promise<void> {
    const now = getLocalTimestamp();
    await this.sleepTimerModel.updateMany(
      {
        status: sleepTimerStatus.SLEEPING,
        endSleepTime: { $lte: now, $ne: null },
        isDeleted: false,
      },
      {
        $set: { status: sleepTimerStatus.AWAKE },
      },
    ).exec();
  }

  private getLocalDateAtMidnight(date: Date): Date {
    const localYear = date.getFullYear();
    const localMonth = date.getMonth();
    const localDay = date.getDate();
    const localMidnight = new Date(localYear, localMonth, localDay, 0, 0, 0, 0);
    const offsetMs = localMidnight.getTimezoneOffset() * 60000;
    return new Date(localMidnight.getTime() - offsetMs);
  }

  async create(createSleepTimerDto: CreateSleepTimerDto, userId: string): Promise<SleepTimer> {
    const now = getLocalTimestamp();
    const status = createSleepTimerDto.status || sleepTimerStatus.SLEEPING;
    const startSleepTime = status === sleepTimerStatus.SLEEPING ? now : undefined;
    const date = startSleepTime 
      ? this.getLocalDateAtMidnight(startSleepTime)
      : this.getLocalDateAtMidnight(now);
    
    const sleepTimer = new this.sleepTimerModel({
      campus: new Types.ObjectId(createSleepTimerDto.campus),
      room: new Types.ObjectId(createSleepTimerDto.room),
      child: new Types.ObjectId(createSleepTimerDto.child),
      cotRoom: new Types.ObjectId(createSleepTimerDto.cotRoom),
      date: date,
      startSleepTime: startSleepTime,
      endSleepTime: undefined,
      status: status,
      createdBy: new Types.ObjectId(userId),
      cotCheckTimes: [],
      isDeleted: false,
    });
    
    const saved = await sleepTimer.save();
    await this.syncWellbeingEntry(saved, userId);
    return saved;
  }

  async findAll(queryDto: QuerySleepTimerDto, user?: User): Promise<PaginatedSleepTimerResult> {
    await this.checkAndUpdateExpiredSleepTimers();

    const {
      page = 1,
      limit = 15,
      search,
      campus,
      room,
      child,
      cotRoom,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const skip = (page - 1) * limit;
    let query: any = { isDeleted: false };

    if (campus) {
      query.campus = new Types.ObjectId(campus);
    }

    if (room) {
      query.room = new Types.ObjectId(room);
    }

    if (child) {
      query.child = new Types.ObjectId(child);
    }

    if (cotRoom) {
      query.cotRoom = new Types.ObjectId(cotRoom);
    }

    if (status) {
      query.status = status;
    }

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    if (search) {
      query.$or = [
        { 'child.fullName': { $regex: search, $options: 'i' } },
        { 'room.name': { $regex: search, $options: 'i' } },
        { 'cotRoom.name': { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.sleepTimerModel
        .find(query)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('child', 'fullName')
        .populate('cotRoom', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.sleepTimerModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, user?: User): Promise<SleepTimer> {
    await this.checkAndUpdateExpiredSleepTimers();

    let query: any = { _id: id, isDeleted: false };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const sleepTimer = await this.sleepTimerModel
      .findOne(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('cotRoom', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!sleepTimer) {
      throw new NotFoundException(`Sleep timer with ID '${id}' not found`);
    }

    if (sleepTimer.endSleepTime && sleepTimer.endSleepTime <= getLocalTimestamp() && sleepTimer.status === sleepTimerStatus.SLEEPING) {
      sleepTimer.status = sleepTimerStatus.AWAKE;
      await sleepTimer.save();
    }

    return sleepTimer;
  }

  async update(id: string, updateSleepTimerDto: UpdateSleepTimerDto, user?: User): Promise<SleepTimer> {
    const sleepTimer = await this.findOne(id, user);
    const updateData: any = {};
    const now = getLocalTimestamp();
    let nextStatus: sleepTimerStatus | undefined = updateSleepTimerDto.status;
    let nextStartTime: Date | undefined;
    let nextEndTime: Date | undefined;
    let shouldClearEndTime = false;

    if (updateSleepTimerDto.campus) {
      updateData.campus = new Types.ObjectId(updateSleepTimerDto.campus);
    }

    if (updateSleepTimerDto.room) {
      updateData.room = new Types.ObjectId(updateSleepTimerDto.room);
    }

    if (updateSleepTimerDto.child) {
      updateData.child = new Types.ObjectId(updateSleepTimerDto.child);
    }

    if (updateSleepTimerDto.cotRoom) {
      updateData.cotRoom = new Types.ObjectId(updateSleepTimerDto.cotRoom);
    }

    if (updateSleepTimerDto.date) {
      const date = new Date(updateSleepTimerDto.date);
      updateData.date = this.getLocalDateAtMidnight(date);
    }

    if (updateSleepTimerDto.startSleepTime) {
      nextStartTime = new Date(updateSleepTimerDto.startSleepTime);
    }

    if (updateSleepTimerDto.endSleepTime) {
      nextEndTime = new Date(updateSleepTimerDto.endSleepTime);
      if (nextEndTime > now && nextStatus === sleepTimerStatus.AWAKE) {
        throw new BadRequestException('Cannot set status to awake when end sleep time is in the future');
      }
    }

    if (!nextStatus && nextEndTime) {
      nextStatus = nextEndTime <= now ? sleepTimerStatus.AWAKE : sleepTimerStatus.SLEEPING;
    }

    if (!nextStatus && nextStartTime && nextStartTime <= now) {
      nextStatus = sleepTimerStatus.SLEEPING;
    }

    if (nextStatus === sleepTimerStatus.AWAKE) {
      if (nextEndTime && nextEndTime > now) {
        throw new BadRequestException('Cannot set status to awake when end sleep time is in the future');
      }
      if (!nextEndTime) {
        nextEndTime = new Date();
      }
    }

    if (nextStatus === sleepTimerStatus.SLEEPING && !updateSleepTimerDto.endSleepTime) {
      shouldClearEndTime = true;
      nextEndTime = undefined;
    }

    if (nextStartTime) {
      updateData.startSleepTime = nextStartTime;
    }

    if (typeof nextStatus !== 'undefined') {
      updateData.status = nextStatus;
    }

    if (nextEndTime) {
      updateData.endSleepTime = nextEndTime;
    } else if (shouldClearEndTime) {
      updateData.endSleepTime = undefined;
    }

    Object.assign(sleepTimer, updateData);
    const updated = await sleepTimer.save();
    await this.syncWellbeingEntry(updated, user?._id?.toString() || '');
    return updated;
  }

  async remove(id: string, user?: User): Promise<void> {
    const sleepTimer = await this.findOne(id, user);
    sleepTimer.isDeleted = true;
    await sleepTimer.save();
    await this.deleteWellbeingEntry(id);
  }

  async startSleep(id: string, user?: User): Promise<SleepTimer> {
    const sleepTimer = await this.findOne(id, user);

    if (sleepTimer.status === sleepTimerStatus.SLEEPING) {
      throw new BadRequestException('Child is already sleeping');
    }

    const startTime = getLocalTimestamp();
    sleepTimer.startSleepTime = startTime;
    sleepTimer.status = sleepTimerStatus.SLEEPING;
    if (!sleepTimer.date) {
      sleepTimer.date = this.getLocalDateAtMidnight(startTime);
    }

    const updated = await sleepTimer.save();
    await this.syncWellbeingEntry(updated, user?._id?.toString() || '');
    return updated;
  }

  async endSleep(id: string, user?: User): Promise<SleepTimer> {
    const sleepTimer = await this.findOne(id, user);

    if (sleepTimer.status === sleepTimerStatus.AWAKE) {
      throw new BadRequestException('Child is already awake');
    }

    sleepTimer.endSleepTime = getLocalTimestamp();
    sleepTimer.status = sleepTimerStatus.AWAKE;

    await sleepTimer.save();
    await this.syncWellbeingEntry(sleepTimer, user?._id?.toString() || '');
    
    return this.findOne(id, user);
  }

  async addCotCheckTime(id: string, cotCheckTime: Date, user?: User): Promise<SleepTimer> {
    const sleepTimer = await this.findOne(id, user);

    if (!sleepTimer.cotCheckTimes) {
      sleepTimer.cotCheckTimes = [];
    }

    sleepTimer.cotCheckTimes.push(cotCheckTime);
    sleepTimer.cotCheckTimes.sort((a, b) => a.getTime() - b.getTime());

    const updated = await sleepTimer.save();
    await this.syncWellbeingEntry(updated, user?._id?.toString() || '');
    return updated;
  }

  async getCurrentlySleeping(cotRoomId: string, user?: User): Promise<SleepTimer[]> {
    await this.checkAndUpdateExpiredSleepTimers();

    let query: any = {
      cotRoom: new Types.ObjectId(cotRoomId),
      status: sleepTimerStatus.SLEEPING,
      isDeleted: false,
    };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    return this.sleepTimerModel
      .find(query)
      .populate('child', 'fullName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('cotRoom', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCotRoom(cotRoomId: string, user?: User): Promise<SleepTimer[]> {
    await this.checkAndUpdateExpiredSleepTimers();

    let query: any = {
      cotRoom: new Types.ObjectId(cotRoomId),
      isDeleted: false,
    };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    return this.sleepTimerModel
      .find(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('cotRoom', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByChildId(childId: string, user?: User): Promise<SleepTimer[]> {
    await this.checkAndUpdateExpiredSleepTimers();

    let query: any = {
      child: new Types.ObjectId(childId),
      isDeleted: false,
    };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    return this.sleepTimerModel
      .find(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('cotRoom', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  private async syncWellbeingEntry(sleepTimer: SleepTimer, authorId: string): Promise<void> {
    if (!sleepTimer.child) return;
    if (!authorId) return;

    const payload = this.buildPayload(sleepTimer);
    let childId: string;
    if (sleepTimer.child instanceof Types.ObjectId) {
      childId = sleepTimer.child.toString();
    } else if ((sleepTimer.child as any)?._id) {
      childId = (sleepTimer.child as any)._id.toString();
    } else {
      childId = String(sleepTimer.child);
    }
    const refId = sleepTimer._id.toString();
    
    const existing = await this.wellbeingService.findByRefIdAndChild(
      refId,
      childId,
      'sleep-timer',
    );

    if (existing) {
      await this.wellbeingService.update(
        existing._id.toString(),
        payload,
        `Sleep timer ${sleepTimer.status === sleepTimerStatus.SLEEPING ? 'started' : 'ended'}`,
      );
    } else {
      await this.wellbeingService.create(
        'sleep-timer',
        refId,
        childId,
        payload,
        authorId,
        sleepTimer.campus ? [sleepTimer.campus.toString()] : [],
        `Sleep timer ${sleepTimer.status === sleepTimerStatus.SLEEPING ? 'started' : 'created'}`,
      );
    }
  }

  private buildPayload(sleepTimer: SleepTimer): any {
    return {
      status: sleepTimer.status || sleepTimerStatus.AWAKE,
      startSleepTime: sleepTimer.startSleepTime ? sleepTimer.startSleepTime.toISOString() : null,
      endSleepTime: sleepTimer.endSleepTime ? sleepTimer.endSleepTime.toISOString() : null,
      cotRoom: sleepTimer.cotRoom?.toString() || null,
      cotCheckTimes: (sleepTimer.cotCheckTimes || []).map((time: Date) => time.toISOString()),
      cotCheckCount: (sleepTimer.cotCheckTimes || []).length,
    };
  }

  private async deleteWellbeingEntry(sleepTimerId: string): Promise<void> {
    try {
      const entries = await this.wellbeingService.findByRefId(sleepTimerId, 'sleep-timer');
      await Promise.all(entries.map((entry) => this.wellbeingService.remove(entry._id.toString())));
    } catch (error) {
      this.logger.error('Failed to delete wellbeing entries for sleep timer:', error);
    }
  }
}
