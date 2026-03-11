import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WellnessPlan, WellnessPlanStatus } from '../schemas/wellness-plan.schema';
import { CreateWellnessPlanDto, ApiWellnessPlanStatus } from '../dto/create-wellness-plan.dto';
import { UpdateWellnessPlanDto } from '../dto/update-wellness-plan.dto';
import { QueryWellnessPlanDto } from '../dto/query-wellness-plan.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class WellnessPlanService {
  constructor(
    @InjectModel(WellnessPlan.name)
    private readonly wellnessPlanModel: Model<WellnessPlan>,
  ) {}

  async create(dto: CreateWellnessPlanDto, currentUser: User): Promise<WellnessPlan> {
    const {
      campus: campusId,
      room: roomId,
      children: childrenId,
      date: dateString,
      initialPlans: initialPlansDto,
      status: statusDto,
      ...restDto
    } = dto;
    const createdPayload: Record<string, unknown> = {
      ...restDto,
      campus: new Types.ObjectId(campusId),
      room: new Types.ObjectId(roomId),
      children: new Types.ObjectId(childrenId),
      createdBy: currentUser._id,
      isDeleted: false,
    };
    if (dateString) {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      createdPayload.date = date;
    }
    if (initialPlansDto && Array.isArray(initialPlansDto)) {
      createdPayload.initialPlans = initialPlansDto.map((plan) => {
        const planData: Record<string, unknown> = { ...plan };
        if (plan.date) {
          const planDate = new Date(plan.date);
          if (Number.isNaN(planDate.getTime())) {
            throw new BadRequestException('Invalid initial plan date format');
          }
          planData.date = planDate;
        }
        return planData;
      });
    }
    const payloadStatus =
      statusDto === undefined
        ? WellnessPlanStatus.DRAFT
        : statusDto === ApiWellnessPlanStatus.PUBLISHED
        ? WellnessPlanStatus.PUBLISHED
        : WellnessPlanStatus.DRAFT;
    createdPayload.status = payloadStatus;
    const created = new this.wellnessPlanModel(createdPayload);
    return created.save();
  }

  async findAll(query?: QueryWellnessPlanDto): Promise<WellnessPlan[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      date?: DateRange;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.room = new Types.ObjectId(query.room);
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
    const mongoFilter: Record<string, unknown> = { ...filter };
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.wellnessPlanModel
        .find(mongoFilter)
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
    return this.wellnessPlanModel
      .find(mongoFilter)
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

  async findOne(id: string): Promise<WellnessPlan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellness plan ID format');
    }
    const plan = await this.wellnessPlanModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!plan) {
      throw new NotFoundException('Wellness plan not found');
    }
    return plan;
  }

  async update(id: string, dto: UpdateWellnessPlanDto, currentUser: User): Promise<WellnessPlan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellness plan ID format');
    }
    const {
      campus: campusId,
      room: roomId,
      children: childrenId,
      date: dateString,
      initialPlans: initialPlansDto,
      status: statusDto,
      ...restDto
    } = dto;
    const updatePayload: Record<string, unknown> = {
      ...restDto,
      updatedBy: currentUser._id,
    };
    if (campusId) {
      updatePayload.campus = new Types.ObjectId(campusId);
    }
    if (roomId) {
      updatePayload.room = new Types.ObjectId(roomId);
    }
    if (childrenId) {
      updatePayload.children = new Types.ObjectId(childrenId);
    }
    if (dateString) {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      updatePayload.date = date;
    }
    if (initialPlansDto && Array.isArray(initialPlansDto)) {
      updatePayload.initialPlans = initialPlansDto.map((plan) => {
        const planData: Record<string, unknown> = { ...plan };
        if (plan.date) {
          const planDate = new Date(plan.date);
          if (Number.isNaN(planDate.getTime())) {
            throw new BadRequestException('Invalid initial plan date format');
          }
          planData.date = planDate;
        }
        return planData;
      });
    }
    if (statusDto !== undefined) {
      updatePayload.status =
        statusDto === ApiWellnessPlanStatus.PUBLISHED
          ? WellnessPlanStatus.PUBLISHED
          : WellnessPlanStatus.DRAFT;
    }
    const updated = await this.wellnessPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updatePayload, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('Wellness plan not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wellness plan ID format');
    }
    const removed = await this.wellnessPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('Wellness plan not found');
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
    const results = await this.wellnessPlanModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }
}


