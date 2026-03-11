import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sunscreen } from '../schemas/sunscreen.schema';
import { CreateSunscreenDto } from '../dto/create-sunscreen.dto';
import { UpdateSunscreenDto } from '../dto/update-sunscreen.dto';
import { QuerySunscreenDto } from '../dto/query-sunscreen.dto';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { User } from '../../users/schemas/user.schema';
import { compareObjectIds } from '../../../utils/mongoose-helper';

@Injectable()
export class SunscreenService {
  constructor(
    @InjectModel(Sunscreen.name) private readonly sunscreenModel: Model<Sunscreen>,
  ) { }

  async create(dto: CreateSunscreenDto, authorId: string): Promise<Sunscreen> {
    const payload = this.buildCreatePayload(dto, authorId);
    const created = await this.sunscreenModel.create(payload);
    return created;
  }

  async findAll(query: QuerySunscreenDto, user?: User): Promise<PaginatedResultDto<Sunscreen>> {
    const {
      search = '',
      campus,
      roomId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    let filters: any = { isDeleted: { $ne: true } };

    if (campus) {
      filters.campus = new Types.ObjectId(campus);
    }
    if (roomId) {
      filters.rooms = new Types.ObjectId(roomId);
    }

    // Access control based on current user
    if (!isAdministrator(user)) {
      if (user?.rooms && user.rooms.length > 0) {
        if (!filters.rooms) {
          filters.rooms = { $in: user.rooms as any };
        }
      } else if (user?.campuses && user.campuses.length > 0) {
        const campusFilter = buildStrictCampusInFilterByIds(user.campuses as any, 'campus');
        Object.assign(filters, campusFilter);
      } else {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    // Base query
    let queryExec = this.sunscreenModel.find(filters)
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('staff', 'firstName lastName')
      .populate('author', 'firstName lastName username')
      .populate('sunscreenChildEntries.children', 'fullName')
      .populate('sunscreenChildEntries.slots.staff', 'firstName lastName')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      queryExec.exec(),
      this.sunscreenModel.countDocuments(filters).exec(),
    ]);

    // Apply in-memory search across populated fields if search present
    const lowered = search.trim().toLowerCase();
    const filtered = lowered
      ? data.filter((doc: any) => {
        const dateStr = new Date(doc.date).toDateString().toLowerCase();
        const campusName = (doc.campus?.name || '').toLowerCase();
        const roomNames = Array.isArray(doc.rooms) ? doc.rooms.map((r: any) => r?.name || '').join(' ').toLowerCase() : '';
        const authorName = ([doc.author?.firstName, doc.author?.lastName].filter(Boolean).join(' ') || doc.author?.username || '').toLowerCase();
        return (
          dateStr.includes(lowered) ||
          campusName.includes(lowered) ||
          roomNames.includes(lowered) ||
          authorName.includes(lowered)
        );
      })
      : data;

    return {
      data: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, currentUser?: User): Promise<Sunscreen> {
    const found = await this.sunscreenModel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('staff', 'firstName lastName')
      .populate('author', 'firstName lastName username')
      .populate('sunscreenChildEntries.children', 'fullName')
      .populate('sunscreenChildEntries.slots.staff', 'firstName lastName')
      .exec();
    if (!found) throw new NotFoundException('Sunscreen record not found');

    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms &&
        currentUser.rooms.some((r) =>
          Array.isArray((found as any).rooms) && (found as any).rooms.some((rr: any) => compareObjectIds(r as any, rr as any)),
        );
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (found as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Sunscreen record');
      }
    }
    return found;
  }

  async update(id: string, dto: UpdateSunscreenDto, currentUser?: User): Promise<Sunscreen> {
    const existing = await this.sunscreenModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Sunscreen record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms &&
        currentUser.rooms.some((r) =>
          Array.isArray((existing as any).rooms) &&
          (existing as any).rooms.some((rr: any) => compareObjectIds(r as any, rr as any)),
        );
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to update this Sunscreen record');
      }
    }
    const update: any = {};
    if (dto.date != null) update.date = new Date(dto.date);
    if (dto.campus != null) update.campus = new Types.ObjectId(dto.campus);
    if (dto.staff != null) update.staff = new Types.ObjectId(dto.staff);
    if (dto.rooms !== undefined) update.rooms = dto.rooms ? dto.rooms.map((r) => new Types.ObjectId(r)) : [];
    if (dto.sunscreenChildEntries != null) {
      update.sunscreenChildEntries = (dto.sunscreenChildEntries || []).map((entry) => ({
        children: this.normalizeChildren((entry as any).children),
        slots: this.mapSlots(entry.slots || []),
      }));
    }
    const updated = await this.sunscreenModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Sunscreen record not found');
    return updated;
  }

  async remove(id: string, currentUser?: User): Promise<void> {
    const existing = await this.sunscreenModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Sunscreen record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms &&
        currentUser.rooms.some((r) =>
          Array.isArray((existing as any).rooms) && (existing as any).rooms.some((rr: any) => compareObjectIds(r as any, rr as any)),
        );
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to delete this Sunscreen record');
      }
    }
    const res = await this.sunscreenModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!res) throw new NotFoundException('Sunscreen record not found');
  }

  // Helpers
  private buildCreatePayload(dto: CreateSunscreenDto, authorId: string): any {
    return {
      date: new Date(dto.date),
      campus: new Types.ObjectId(dto.campus),
      rooms: Array.isArray(dto.rooms) ? dto.rooms.map((r) => new Types.ObjectId(r)) : undefined,
      staff: new Types.ObjectId(dto.staff),
      author: new Types.ObjectId(authorId),
      sunscreenChildEntries: (dto.sunscreenChildEntries || []).map((entry) => ({
        children: this.normalizeChildren((entry as any).children),
        slots: this.mapSlots(entry.slots || []),
      })),
    };
  }

  private normalizeChildren(raw: unknown): Types.ObjectId[] {
    const list = Array.isArray(raw) ? raw : (raw != null ? [raw] : []);
    return (list as any[]).map((c) => new Types.ObjectId(String(c)));
  }

  private mapSlots(slots: Array<{ time?: string; staff?: string; value?: any; doneTime?: string }>) {
    return (slots || []).map((s) => ({
      time: s.time,
      doneTime: s.doneTime,
      staff: s.staff ? new Types.ObjectId(s.staff) : undefined,
      value: s.value ?? null,
    }));
  }
}


