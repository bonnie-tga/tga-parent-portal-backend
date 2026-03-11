import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CasualDay } from '../schemas/casual-day.schema';
import { CreateCasualDayDto } from '../dto/create-casual-day.dto';
import { UpdateCasualDayDto } from '../dto/update-casual-day.dto';
import { QueryCasualDayDto } from '../dto/query-casual-day.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class CasualDayService {
  constructor(
    @InjectModel(CasualDay.name)
    private readonly casualDayModel: Model<CasualDay>,
  ) {}

  async create(
    dto: CreateCasualDayDto,
    currentUser: User,
  ): Promise<CasualDay> {
    const campusObjectId = new Types.ObjectId(dto.campus);
    const roomObjectId = new Types.ObjectId(dto.room);
    const dateValue = new Date(dto.date);
    if (Number.isNaN(dateValue.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    const childrenIds = dto.childrenIds ?? [];
    const childrenObjectIds =
      childrenIds.length > 0
        ? childrenIds.map((id: string) => new Types.ObjectId(id))
        : [];
    const created = new this.casualDayModel({
      campus: campusObjectId,
      room: roomObjectId,
      parentName: dto.parentName,
      parentEmail: dto.parentEmail,
      contactNumber: dto.contactNumber,
      children: childrenObjectIds,
      date: dateValue,
      replaceChildOnHoliday: dto.replaceChildOnHoliday,
      comments: dto.comments,
      submittedBy: currentUser._id,
      isDeleted: false,
    });
    return created.save();
  }

  async findAll(query?: QueryCasualDayDto): Promise<CasualDay[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      children?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      date?: DateRange;
    };
    const isDeletedParam = query?.isDeleted;
    const isDeletedValue = isDeletedParam === 'true';
    const filter: FindAllFilter = { isDeleted: isDeletedValue };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
    }
    if (query?.child) {
      filter.children = new Types.ObjectId(query.child);
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
        filter.date = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const baseQuery = this.casualDayModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName profileImage')
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
      const children = Array.isArray(item.children) ? item.children : [];
      return children.some((child: any) => {
        const childName =
          child && typeof child.fullName === 'string'
            ? child.fullName
            : '';
        return searchRegex.test(childName);
      });
    });
  }

  async findOne(id: string): Promise<CasualDay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Casual Day ID format');
    }
    const item = await this.casualDayModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Casual Day entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateCasualDayDto,
  ): Promise<CasualDay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Casual Day ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    if (dto.campus !== undefined) {
      updatePayload.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.room !== undefined) {
      updatePayload.room = new Types.ObjectId(dto.room);
    }
    if (dto.parentName !== undefined) {
      updatePayload.parentName = dto.parentName;
    }
    if (dto.parentEmail !== undefined) {
      updatePayload.parentEmail = dto.parentEmail;
    }
    if (dto.contactNumber !== undefined) {
      updatePayload.contactNumber = dto.contactNumber;
    }
    if (dto.childrenIds !== undefined) {
      updatePayload.children = dto.childrenIds.map(
        (id: string) => new Types.ObjectId(id),
      );
    }
    if (dto.date !== undefined) {
      const parsedDate = new Date(dto.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        updatePayload.date = parsedDate;
      }
    }
    if (dto.replaceChildOnHoliday !== undefined) {
      updatePayload.replaceChildOnHoliday = dto.replaceChildOnHoliday;
    }
    if (dto.comments !== undefined) {
      updatePayload.comments = dto.comments;
    }
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }
    if (dto.decisionStatus !== undefined) {
      updatePayload.decisionStatus = dto.decisionStatus;
    }
    const updated = await this.casualDayModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updatePayload,
        { new: true },
      )
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!updated) {
      throw new NotFoundException('Casual Day entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Casual Day ID format');
    }
    const removed = await this.casualDayModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Casual Day entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, date: { $type: 'date' } } },
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
    const results = await this.casualDayModel.aggregate(pipeline).exec();
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




