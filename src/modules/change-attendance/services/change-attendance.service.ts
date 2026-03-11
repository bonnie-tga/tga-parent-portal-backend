import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChangeAttendance } from '../schemas/change-attendance.schema';
import { CreateChangeAttendanceDto } from '../dto/create-change-attendance.dto';
import { UpdateChangeAttendanceDto } from '../dto/update-change-attendance.dto';
import { QueryChangeAttendanceDto } from '../dto/query-change-attendance.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class ChangeAttendanceService {
  constructor(
    @InjectModel(ChangeAttendance.name)
    private readonly changeAttendanceModel: Model<ChangeAttendance>,
  ) {}

  async create(
    dto: CreateChangeAttendanceDto,
    currentUser: User,
  ): Promise<ChangeAttendance> {
    const campusObjectId = new Types.ObjectId(dto.campusId);
    const roomObjectId = new Types.ObjectId(dto.roomId);
    const childObjectId = new Types.ObjectId(dto.childId);
    const commenceOnDate = new Date(dto.commenceOn);
    if (Number.isNaN(commenceOnDate.getTime())) {
      throw new BadRequestException('Invalid commenceOn date');
    }
    const created = new this.changeAttendanceModel({
      campus: campusObjectId,
      room: roomObjectId,
      child: childObjectId,
      parentName: dto.parentName,
      contactNumber: dto.contactNumber,
      days: dto.days,
      commenceOn: commenceOnDate,
      submittedBy: currentUser._id,
      decisionStatus: dto.decisionStatus,
      isDeleted: false,
    });
    return created.save();
  }

  async findAll(
    query?: QueryChangeAttendanceDto,
  ): Promise<ChangeAttendance[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      child?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      commenceOn?: DateRange;
    };
    const isDeletedParam = query?.isDeleted;
    const isDeletedValue = isDeletedParam === 'true';
    const filter: FindAllFilter = {
      isDeleted: isDeletedValue,
    };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.child) {
      filter.child = new Types.ObjectId(query.child);
    }
    if (query?.parent) {
      filter.submittedBy = new Types.ObjectId(query.parent);
    }
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.decisionStatus) {
      filter.decisionStatus = query.decisionStatus;
    }
    if (query?.date) {
      const [yearPart, monthPart] = query.date.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        filter.commenceOn = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const baseQuery = this.changeAttendanceModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('submittedBy', 'firstName lastName username');
    const results = await baseQuery.exec();
    if (!query?.search) {
      return results;
    }
    const searchTerm = query.search.trim();
    if (!searchTerm) {
      return [];
    }
    const searchRegex = new RegExp(searchTerm, 'i');
    return results.filter((item: any) => {
      const child = item.child as any;
      const childName =
        child && typeof child.fullName === 'string' ? child.fullName : '';
      return searchRegex.test(childName);
    });
  }

  async findOne(id: string): Promise<ChangeAttendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Attendance ID format');
    }
    const item = await this.changeAttendanceModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Change Attendance entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateChangeAttendanceDto,
  ): Promise<ChangeAttendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Attendance ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    if (dto.campusId !== undefined) {
      updatePayload.campus = new Types.ObjectId(dto.campusId);
    }
    if (dto.roomId !== undefined) {
      updatePayload.room = new Types.ObjectId(dto.roomId);
    }
    if (dto.childId !== undefined) {
      updatePayload.child = new Types.ObjectId(dto.childId);
    }
    if (dto.parentName !== undefined) {
      updatePayload.parentName = dto.parentName;
    }
    if (dto.contactNumber !== undefined) {
      updatePayload.contactNumber = dto.contactNumber;
    }
    if (dto.days !== undefined) {
      updatePayload.days = dto.days;
    }
    if (dto.commenceOn !== undefined) {
      const parsedDate = new Date(dto.commenceOn);
      if (!Number.isNaN(parsedDate.getTime())) {
        updatePayload.commenceOn = parsedDate;
      }
    }
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }
    if (dto.decisionStatus !== undefined) {
      updatePayload.decisionStatus = dto.decisionStatus;
    }
    const updated = await this.changeAttendanceModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      )
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!updated) {
      throw new NotFoundException('Change Attendance entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Change Attendance ID format');
    }
    const removed = await this.changeAttendanceModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Change Attendance entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, commenceOn: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$commenceOn' },
            month: { $month: '$commenceOn' },
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
    const results = await this.changeAttendanceModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', {
      month: 'long',
      year: 'numeric',
    });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }
}


