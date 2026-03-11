import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SchoolReadinessChecklist,
  SchoolReadinessChecklistStatus,
} from '../schemas/school-readiness-checklist.schema';
import { CreateSchoolReadinessChecklistDto } from '../dto/create-school-readiness-checklist.dto';
import { UpdateSchoolReadinessChecklistDto } from '../dto/update-school-readiness-checklist.dto';
import { User } from '../../users/schemas/user.schema';
import { QuerySchoolReadinessChecklistDto } from '../dto/query-school-readiness-checklist.dto';

@Injectable()
export class SchoolReadinessChecklistService {
  constructor(
    @InjectModel(SchoolReadinessChecklist.name)
    private readonly schoolReadinessChecklistModel: Model<SchoolReadinessChecklist>,
  ) {}

  async create(
    dto: CreateSchoolReadinessChecklistDto,
    currentUser: User,
  ): Promise<SchoolReadinessChecklist> {
    const createdPayload: any = {
      ...dto,
      campus: new Types.ObjectId(dto.campus),
      room: new Types.ObjectId(dto.room),
      children: new Types.ObjectId(dto.children),
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
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
        ? SchoolReadinessChecklistStatus.DRAFT
        : dto.status === 'Published'
        ? SchoolReadinessChecklistStatus.PUBLISHED
        : SchoolReadinessChecklistStatus.DRAFT;
    createdPayload.status = payloadStatus;
    const created = new this.schoolReadinessChecklistModel(createdPayload);
    return created.save();
  }

  async findAll(query?: QuerySchoolReadinessChecklistDto): Promise<SchoolReadinessChecklist[]> {
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      status?: SchoolReadinessChecklistStatus;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.status) {
      filter.status = query.status;
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
      const allResults = await this.schoolReadinessChecklistModel
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
    return this.schoolReadinessChecklistModel
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

  async findOne(id: string): Promise<SchoolReadinessChecklist> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid school readiness checklist ID format');
    }
    const checklist = await this.schoolReadinessChecklistModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!checklist) {
      throw new NotFoundException('School readiness checklist not found');
    }
    return checklist;
  }

  async update(
    id: string,
    dto: UpdateSchoolReadinessChecklistDto,
    currentUser: User,
  ): Promise<SchoolReadinessChecklist> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid school readiness checklist ID format');
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
    const updated = await this.schoolReadinessChecklistModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updatePayload, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('School readiness checklist not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid school readiness checklist ID format');
    }
    const removed = await this.schoolReadinessChecklistModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('School readiness checklist not found');
    }
  }
}


