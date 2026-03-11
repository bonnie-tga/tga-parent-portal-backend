import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpcomingHoliday } from '../schemas/upcoming-holiday.schema';
import { CreateUpcomingHolidayDto } from '../dto/create-upcoming-holiday.dto';
import { UpdateUpcomingHolidayDto } from '../dto/update-upcoming-holiday.dto';
import { QueryUpcomingHolidayDto } from '../dto/query-upcoming-holiday.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class UpcomingHolidayService {
  constructor(
    @InjectModel(UpcomingHoliday.name)
    private readonly upcomingHolidayModel: Model<UpcomingHoliday>,
  ) {}

  async create(
    dto: CreateUpcomingHolidayDto,
    currentUser: User,
  ): Promise<UpcomingHoliday> {
    const campusObjectId = new Types.ObjectId(dto.campus);
    const roomObjectId = new Types.ObjectId(dto.room);
    const childrenObjectIds = dto.childrenIds.map(
      (id: string) => new Types.ObjectId(id),
    );
    const startDateValue = new Date(dto.startDate);
    const endDateValue = new Date(dto.endDate);
    if (Number.isNaN(startDateValue.getTime())) {
      throw new BadRequestException('Invalid startDate value');
    }
    if (Number.isNaN(endDateValue.getTime())) {
      throw new BadRequestException('Invalid endDate value');
    }
    if (endDateValue < startDateValue) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    const created = new this.upcomingHolidayModel({
      campus: campusObjectId,
      room: roomObjectId,
      children: childrenObjectIds,
      numberOfDays: dto.numberOfDays,
      startDate: startDateValue,
      endDate: endDateValue,
      comments: dto.comments,
      submittedBy: currentUser._id,
      isDeleted: false,
    });
    return created.save();
  }

  async findAll(
    query?: QueryUpcomingHolidayDto,
  ): Promise<UpcomingHoliday[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      children?: Types.ObjectId;
      submittedBy?: Types.ObjectId;
      status?: string;
      decisionStatus?: string;
      startDate?: DateRange;
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
        filter.startDate = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const baseQuery = this.upcomingHolidayModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
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

  async findOne(id: string): Promise<UpcomingHoliday> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Upcoming Holiday ID format');
    }
    const item = await this.upcomingHolidayModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('submittedBy', 'firstName lastName username')
      .exec();
    if (!item) {
      throw new NotFoundException('Upcoming Holiday entry not found');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateUpcomingHolidayDto,
  ): Promise<UpcomingHoliday> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Upcoming Holiday ID format');
    }
    const updatePayload: Record<string, unknown> = {};
    if (dto.campus !== undefined) {
      updatePayload.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.room !== undefined) {
      updatePayload.room = new Types.ObjectId(dto.room);
    }
    if (dto.childrenIds !== undefined) {
      updatePayload.children = dto.childrenIds.map(
        (id: string) => new Types.ObjectId(id),
      );
    }
    if (dto.numberOfDays !== undefined) {
      updatePayload.numberOfDays = dto.numberOfDays;
    }
    if (dto.startDate !== undefined) {
      const parsedStart = new Date(dto.startDate);
      if (!Number.isNaN(parsedStart.getTime())) {
        updatePayload.startDate = parsedStart;
      }
    }
    if (dto.endDate !== undefined) {
      const parsedEnd = new Date(dto.endDate);
      if (!Number.isNaN(parsedEnd.getTime())) {
        updatePayload.endDate = parsedEnd;
      }
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
    const updated = await this.upcomingHolidayModel
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
      throw new NotFoundException('Upcoming Holiday entry not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Upcoming Holiday ID format');
    }
    const removed = await this.upcomingHolidayModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true },
      )
      .exec();
    if (!removed) {
      throw new NotFoundException('Upcoming Holiday entry not found');
    }
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, startDate: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$startDate' },
            month: { $month: '$startDate' },
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
    const results = await this.upcomingHolidayModel.aggregate(pipeline).exec();
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




