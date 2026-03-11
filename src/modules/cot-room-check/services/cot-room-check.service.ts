import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CotRoomCheck, CotRoomCheckStatus } from '../schemas/cot-room-check.schema';
import { SleepTimer, sleepTimerStatus } from '../../sleep-timer/schemas/sleep-timer.schema';
import { User } from '../../users/schemas/user.schema';
import { CreateCotRoomCheckDto } from '../dto/create-cot-room-check.dto';
import { UpdateCotRoomCheckDto } from '../dto/update-cot-room-check.dto';
import { QueryCotRoomCheckDto, CotRoomCheckSortOrder } from '../dto/query-cot-room-check.dto';
import { buildCampusFilter } from '../../../common/access/access-filter.util';

export interface PaginatedCotRoomCheckResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChildCotCheckTime {
  childId: string;
  childName: string;
  cotCheckTimes: Date[];
  isOverdue?: boolean[];
}

export interface CotRoomCheckStaffTime {
  staff: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  cotRoom: {
    _id: string;
    name: string;
  };
  time: Date;
}

@Injectable()
export class CotRoomCheckService {
  private readonly logger = new Logger(CotRoomCheckService.name);
  private readonly COT_CHECK_INTERVAL_MS = 10 * 60 * 1000;

  constructor(
    @InjectModel(CotRoomCheck.name) private readonly cotRoomCheckModel: Model<CotRoomCheck>,
    @InjectModel(SleepTimer.name) private readonly sleepTimerModel: Model<SleepTimer>,
  ) {}

  async create(createCotRoomCheckDto: CreateCotRoomCheckDto, userId: string): Promise<CotRoomCheck> {
    const cotRoomId = new Types.ObjectId(createCotRoomCheckDto.cotRoom);
    const checkTime = createCotRoomCheckDto.time ? new Date(createCotRoomCheckDto.time) : new Date();

    const sleepingChildren = await this.sleepTimerModel
      .find({
        cotRoom: cotRoomId,
        status: sleepTimerStatus.SLEEPING,
        isDeleted: false,
      })
      .populate('child', 'fullName')
      .exec();

    const sleepingChildIds = sleepingChildren.map((st) => st.child);

    const cotRoomCheck = new this.cotRoomCheckModel({
      ...createCotRoomCheckDto,
      campus: new Types.ObjectId(createCotRoomCheckDto.campus),
      room: new Types.ObjectId(createCotRoomCheckDto.room),
      cotRoom: cotRoomId,
      staff: new Types.ObjectId(createCotRoomCheckDto.staff),
      date: createCotRoomCheckDto.date ? new Date(createCotRoomCheckDto.date) : new Date(),
      time: checkTime,
      sleepingChildren: sleepingChildIds,
      createdBy: new Types.ObjectId(userId),
      isDeleted: false,
    });

    const savedCheck = await cotRoomCheck.save();

    for (const sleepTimer of sleepingChildren) {
      if (!sleepTimer.cotCheckTimes) {
        sleepTimer.cotCheckTimes = [];
      }
      sleepTimer.cotCheckTimes.push(checkTime);
      sleepTimer.cotCheckTimes.sort((a, b) => a.getTime() - b.getTime());
      await sleepTimer.save();
    }

    return savedCheck.populate([
      { path: 'campus', select: 'name' },
      { path: 'room', select: 'name' },
      { path: 'cotRoom', select: 'name' },
      { path: 'staff', select: 'firstName lastName' },
      { path: 'sleepingChildren', select: 'fullName' },
    ]);
  }

  async findAll(queryDto: QueryCotRoomCheckDto, user?: User): Promise<PaginatedCotRoomCheckResult> {
    const {
      page = 1,
      limit = 15,
      search,
      campus,
      room,
      staff,
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

    if (staff) {
      query.staff = new Types.ObjectId(staff);
    }

    if (cotRoom) {
      query.cotRoom = new Types.ObjectId(cotRoom);
    }

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    if (search) {
      query.$or = [
        { 'staff.firstName': { $regex: search, $options: 'i' } },
        { 'staff.lastName': { $regex: search, $options: 'i' } },
        { 'room.name': { $regex: search, $options: 'i' } },
        { 'cotRoom.name': { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.cotRoomCheckModel
        .find(query)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('cotRoom', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('staff', 'firstName lastName')
        .populate('sleepingChildren', 'fullName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.cotRoomCheckModel.countDocuments(query).exec(),
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

  async findOne(id: string, user?: User): Promise<CotRoomCheck> {
    let query: any = { _id: id, isDeleted: false };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const cotRoomCheck = await this.cotRoomCheckModel
      .findOne(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('cotRoom', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('staff', 'firstName lastName')
      .populate('sleepingChildren', 'fullName')
      .exec();

    if (!cotRoomCheck) {
      throw new NotFoundException(`Cot room check with ID '${id}' not found`);
    }

    return cotRoomCheck;
  }

  async update(id: string, updateCotRoomCheckDto: UpdateCotRoomCheckDto, user?: User): Promise<CotRoomCheck> {
    const cotRoomCheck = await this.findOne(id, user);

    const updateData: any = {};

    if (updateCotRoomCheckDto.campus) {
      updateData.campus = new Types.ObjectId(updateCotRoomCheckDto.campus);
    }

    if (updateCotRoomCheckDto.room) {
      updateData.room = new Types.ObjectId(updateCotRoomCheckDto.room);
    }

    if (updateCotRoomCheckDto.cotRoom) {
      updateData.cotRoom = new Types.ObjectId(updateCotRoomCheckDto.cotRoom);
    }

    if (updateCotRoomCheckDto.staff) {
      updateData.staff = new Types.ObjectId(updateCotRoomCheckDto.staff);
    }

    if (updateCotRoomCheckDto.date) {
      updateData.date = new Date(updateCotRoomCheckDto.date);
    }

    if (updateCotRoomCheckDto.time) {
      updateData.time = new Date(updateCotRoomCheckDto.time);
    }

    if (updateCotRoomCheckDto.cotRoomCheckOptions) {
      updateData.cotRoomCheckOptions = updateCotRoomCheckDto.cotRoomCheckOptions;
    }

    if (updateCotRoomCheckDto.reChecked !== undefined) {
      updateData.reChecked = updateCotRoomCheckDto.reChecked;
    }

    Object.assign(cotRoomCheck, updateData);
    return cotRoomCheck.save();
  }

  async remove(id: string, user?: User): Promise<void> {
    const cotRoomCheck = await this.findOne(id, user);
    cotRoomCheck.isDeleted = true;
    await cotRoomCheck.save();
  }

  async getChildrenWithCotCheckTimes(cotRoomId: string, date?: Date, user?: User): Promise<ChildCotCheckTime[]> {
    let query: any = {
      cotRoom: new Types.ObjectId(cotRoomId),
      isDeleted: false,
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const sleepTimers = await this.sleepTimerModel
      .find(query)
      .populate('child', 'fullName')
      .exec();

    const result: ChildCotCheckTime[] = sleepTimers.map((st) => {
      const cotCheckTimes = st.cotCheckTimes || [];
      const isOverdue = cotCheckTimes.map((time, index) => {
        if (index === 0) return false;
        const prevTime = cotCheckTimes[index - 1];
        const diff = time.getTime() - prevTime.getTime();
        return diff > this.COT_CHECK_INTERVAL_MS;
      });

      const child = st.child as any;
      return {
        childId: child._id ? child._id.toString() : child.toString(),
        childName: child.fullName || '',
        cotCheckTimes,
        isOverdue,
      };
    });

    return result;
  }

  async addChildCotCheckTime(
    childId: string,
    time: Date,
    user?: User,
  ): Promise<SleepTimer> {
    let query: any = {
      child: new Types.ObjectId(childId),
      isDeleted: false,
    };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const sleepTimer = await this.sleepTimerModel.findOne(query).exec();

    if (!sleepTimer) {
      throw new NotFoundException(`Sleep timer for child '${childId}' not found`);
    }

    if (!sleepTimer.cotCheckTimes) {
      sleepTimer.cotCheckTimes = [];
    }

    sleepTimer.cotCheckTimes.push(time);
    sleepTimer.cotCheckTimes.sort((a, b) => a.getTime() - b.getTime());

    return sleepTimer.save();
  }

  async getStaffCotRoomAndTime(cotRoomId: string, user?: User): Promise<CotRoomCheckStaffTime[]> {
    let query: any = {
      cotRoom: new Types.ObjectId(cotRoomId),
      isDeleted: false,
    };

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const cotRoomChecks = await this.cotRoomCheckModel
      .find(query)
      .populate('staff', 'firstName lastName')
      .populate('cotRoom', 'name')
      .select('staff cotRoom time')
      .sort({ time: -1 })
      .lean()
      .exec();

    return cotRoomChecks.map((check) => ({
      staff: {
        _id: (check.staff as any)._id.toString(),
        firstName: (check.staff as any).firstName || '',
        lastName: (check.staff as any).lastName || '',
      },
      cotRoom: {
        _id: (check.cotRoom as any)._id.toString(),
        name: (check.cotRoom as any).name || '',
      },
      time: check.time,
    }));
  }
}
