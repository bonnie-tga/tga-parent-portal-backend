import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Handover, HandoverStatus } from '../schemas/handover.schema';
import { CreateHandoverDto } from '../dto/create-handover.dto';
import { UpdateHandoverDto } from '../dto/update-handover.dto';
import { QueryHandoverDto } from '../dto/query-handover.dto';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { User } from '../../users/schemas/user.schema';
import { compareObjectIds } from '../../../utils/mongoose-helper';

@Injectable()
export class HandoverService {
  constructor(
    @InjectModel(Handover.name) private readonly handoverModel: Model<Handover>,
  ) { }

  async create(dto: CreateHandoverDto, authorId: string, currentUser?: User): Promise<Handover> {
    // Non-admins can only create for campuses they have access to
    if (currentUser && !isAdministrator(currentUser)) {
      const allowed = (currentUser.campuses || []).some((c) => String(c) === String(dto.campus));
      if (!allowed) throw new ForbiddenException('You do not have permission to create for this campus');
    }
    const status = dto.status || HandoverStatus.DRAFT;
    const publishedAt =
      status === HandoverStatus.PUBLISHED
        ? (dto.publishedAt ? new Date(dto.publishedAt) : new Date())
        : (dto.publishedAt ? new Date(dto.publishedAt) : null);
    const created = await this.handoverModel.create({
      campus: new Types.ObjectId(dto.campus),
      room: new Types.ObjectId(dto.room),
      child: new Types.ObjectId(dto.child),
      author: new Types.ObjectId(authorId),
      photos: dto.photos || [],
      wakeUpTime: dto.wakeUpTime,
      breakfastTime: dto.breakfastTime,
      whatWasEaten: dto.whatWasEaten,
      lastTimeOfBottleFeed: dto.lastTimeOfBottleFeed,
      lastTimeOfBottleDetail: dto.lastTimeOfBottleDetail,
      lastNappyChangeTime: dto.lastNappyChangeTime,
      lastNappyChangeDetail: dto.lastNappyChangeDetail,
      specialInstructionsForTheDay: dto.specialInstructionsForTheDay,
      emotionalNeed: dto.emotionalNeed,
      behaviour: dto.behaviour,
      restTime: dto.restTime,
      anyChangeInRoutine: dto.anyChangeInRoutine,
      additionalComments: dto.additionalComments,
      status,
      publishedAt,
    });
    return created;
  }

  async findAll(query: QueryHandoverDto, user?: User): Promise<PaginatedResultDto<Handover>> {
    const {
      search = '',
      campus,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const filters: any = { isDeleted: { $ne: true } };

    // Apply query filters
    if (campus) {
      filters.campus = new Types.ObjectId(campus);
    }
    if (status) {
      filters.status = status;
    }
    if (search && search.trim().length > 0) {
      const regex = new RegExp(search.trim(), 'i');
      filters.$or = [
        { whatWasEaten: regex },
        { lastTimeOfBottleDetail: regex },
        { lastNappyChangeDetail: regex },
        { specialInstructionsForTheDay: regex },
        { emotionalNeed: regex },
        { behaviour: regex },
        { restTime: regex },
        { anyChangeInRoutine: regex },
        { additionalComments: regex },
      ];
    }

    // Access control
    const accessFilter =
      !user || isAdministrator(user)
        ? {}
        : buildStrictCampusInFilterByIds(user.campuses as any, 'campus');
    Object.assign(filters, accessFilter);

    // Sorting
    const sortField = sortBy === 'date' ? 'createdAt' : sortBy;
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.handoverModel.find(filters)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('child', 'fullName')
        .populate('author', 'firstName lastName email')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.handoverModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, currentUser?: User): Promise<Handover> {
    const found = await this.handoverModel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('child', 'fullName')
      .populate('author', 'firstName lastName email')
      .exec();
    if (!found) throw new NotFoundException('Handover record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (found as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Handover record');
      }
    }
    return found;
  }

  async update(id: string, dto: UpdateHandoverDto, currentUser?: User): Promise<Handover> {
    const existing = await this.handoverModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Handover record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to update this Handover record');
      }
    }

    const update: any = {};
    if (dto.campus != null) update.campus = new Types.ObjectId(dto.campus);
    if (dto.room != null) update.room = new Types.ObjectId(dto.room);
    if (dto.child != null) update.child = new Types.ObjectId(dto.child);
    if (dto.photos != null) update.photos = dto.photos;
    if (dto.wakeUpTime !== undefined) update.wakeUpTime = dto.wakeUpTime;
    if (dto.breakfastTime !== undefined) update.breakfastTime = dto.breakfastTime;
    if (dto.whatWasEaten !== undefined) update.whatWasEaten = dto.whatWasEaten;
    if (dto.lastTimeOfBottleFeed !== undefined) update.lastTimeOfBottleFeed = dto.lastTimeOfBottleFeed;
    if (dto.lastTimeOfBottleDetail !== undefined) update.lastTimeOfBottleDetail = dto.lastTimeOfBottleDetail;
    if (dto.lastNappyChangeTime !== undefined) update.lastNappyChangeTime = dto.lastNappyChangeTime;
    if (dto.lastNappyChangeDetail !== undefined) update.lastNappyChangeDetail = dto.lastNappyChangeDetail;
    if (dto.specialInstructionsForTheDay !== undefined) update.specialInstructionsForTheDay = dto.specialInstructionsForTheDay;
    if (dto.emotionalNeed !== undefined) update.emotionalNeed = dto.emotionalNeed;
    if (dto.behaviour !== undefined) update.behaviour = dto.behaviour;
    if (dto.restTime !== undefined) update.restTime = dto.restTime;
    if (dto.anyChangeInRoutine !== undefined) update.anyChangeInRoutine = dto.anyChangeInRoutine;
    if (dto.additionalComments !== undefined) update.additionalComments = dto.additionalComments;
    if (dto.status != null) {
      update.status = dto.status;
      if (dto.publishedAt === undefined) {
        update.publishedAt = dto.status === HandoverStatus.PUBLISHED ? new Date() : null;
      }
    }
    if (dto.publishedAt !== undefined) update.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;

    const updated = await this.handoverModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Handover record not found');
    return updated;
  }

  async remove(id: string, currentUser?: User): Promise<void> {
    const existing = await this.handoverModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Handover record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to delete this Handover record');
      }
    }
    const res = await this.handoverModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!res) throw new NotFoundException('Handover record not found');
  }
}


