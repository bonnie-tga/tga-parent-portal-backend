import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AbcBehaviourObservation,
  AbcBehaviourObservationStatus,
} from '../schemas/abc-behaviour-observation.schema';
import {
  ApiAbcBehaviourObservationStatus,
  CreateAbcBehaviourObservationDto,
} from '../dto/create-abc-behaviour-observation.dto';
import { UpdateAbcBehaviourObservationDto } from '../dto/update-abc-behaviour-observation.dto';
import { QueryAbcBehaviourObservationDto } from '../dto/query-abc-behaviour-observation.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class AbcBehaviourObservationService {
  constructor(
    @InjectModel(AbcBehaviourObservation.name)
    private readonly abcBehaviourObservationModel: Model<AbcBehaviourObservation>,
  ) {}

  async create(
    dto: CreateAbcBehaviourObservationDto,
    currentUser: User,
  ): Promise<AbcBehaviourObservation> {
    const createdPayload: Record<string, unknown> = {
      ...dto,
      campus: new Types.ObjectId(dto.campus),
      room: new Types.ObjectId(dto.room),
      children: new Types.ObjectId(dto.children),
      createdBy: currentUser._id,
      isDeleted: false,
    };
    if (dto.date) {
      const date = new Date(dto.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      createdPayload.date = date;
    }
    const payloadStatus =
      dto.status === undefined
        ? AbcBehaviourObservationStatus.DRAFT
        : dto.status === ApiAbcBehaviourObservationStatus.PUBLISHED
        ? AbcBehaviourObservationStatus.PUBLISHED
        : AbcBehaviourObservationStatus.DRAFT;
    createdPayload.status = payloadStatus;
    const created = new this.abcBehaviourObservationModel(createdPayload);
    return created.save();
  }

  async findAll(
    query?: QueryAbcBehaviourObservationDto,
  ): Promise<AbcBehaviourObservation[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      room?: Types.ObjectId;
      children?: Types.ObjectId;
      status?: AbcBehaviourObservationStatus;
      date?: DateRange;
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
    if (query?.status) {
      filter.status = query.status;
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
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.abcBehaviourObservationModel
        .find(filter)
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
    return this.abcBehaviourObservationModel
      .find(filter)
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

  async findOne(id: string): Promise<AbcBehaviourObservation> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ABC behaviour observation ID format');
    }
    const observation = await this.abcBehaviourObservationModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!observation) {
      throw new NotFoundException('ABC behaviour observation not found');
    }
    return observation;
  }

  async update(
    id: string,
    dto: UpdateAbcBehaviourObservationDto,
    currentUser: User,
  ): Promise<AbcBehaviourObservation> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ABC behaviour observation ID format');
    }
    const updatePayload: Record<string, unknown> = { ...dto, updatedBy: currentUser._id };
    if (dto.date) {
      const date = new Date(dto.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
      updatePayload.date = date;
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
    if (dto.status !== undefined) {
      updatePayload.status =
        dto.status === ApiAbcBehaviourObservationStatus.PUBLISHED
          ? AbcBehaviourObservationStatus.PUBLISHED
          : AbcBehaviourObservationStatus.DRAFT;
    }
    const updated = await this.abcBehaviourObservationModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updatePayload, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('ABC behaviour observation not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ABC behaviour observation ID format');
    }
    const removed = await this.abcBehaviourObservationModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('ABC behaviour observation not found');
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
    const results = await this.abcBehaviourObservationModel.aggregate(pipeline).exec();
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


