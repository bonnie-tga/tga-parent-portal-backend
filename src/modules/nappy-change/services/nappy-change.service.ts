import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NappyChange } from '../schemas/nappy-change.schema';
import { CreateNappyChangeDto } from '../dto/create-nappy-change.dto';
import { UpdateNappyChangeDto } from '../dto/update-nappy-change.dto';
import { QueryNappyChangeDto } from '../dto/query-nappy-change.dto';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { User } from '../../users/schemas/user.schema';
import { compareObjectIds } from '../../../utils/mongoose-helper';
import { WellbeingService } from '../../wellbeing/services/wellbeing.service';

@Injectable()
export class NappyChangeService {
  constructor(
    @InjectModel(NappyChange.name) private readonly nappyModel: Model<NappyChange>,
    private readonly wellbeingService: WellbeingService,
  ) {}

  async create(dto: CreateNappyChangeDto, authorId: string): Promise<NappyChange> {
    const created = await this.nappyModel.create({
      date: this.parseDate(dto.date),
      campus: new Types.ObjectId(dto.campus),
      room: dto.room ? new Types.ObjectId(dto.room) : undefined,
      author: new Types.ObjectId(authorId),
      nappyChildEntries: (dto.nappyChildEntries || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        slots: (entry.slots || []).map((s) => ({
          time: s.time,
          categories: s.categories || [],
          staff: s.staff ? new Types.ObjectId(s.staff) : undefined,
          doneTime: s.doneTime,
        })),
        specialRequirements: entry.specialRequirements,
      })),
    });

    await this.syncWellbeingEntries(created, authorId);
    return created;
  }

  async findAll(query: QueryNappyChangeDto, user?: User): Promise<PaginatedResultDto<NappyChange>> {
    const {
      search = '',
      campus,
      roomId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filters = this.buildFilters(campus, roomId, user);
    if (!filters) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.nappyModel
        .find(filters)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('author', 'firstName lastName username')
        .populate('nappyChildEntries.child', 'fullName')
        .populate('nappyChildEntries.slots.staff', 'firstName lastName')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.nappyModel.countDocuments(filters).exec(),
    ]);

    const filtered = search.trim()
      ? data.filter((doc: any) => this.matchesSearch(doc, search))
      : data;

    return {
      data: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, currentUser?: User): Promise<NappyChange> {
    const found = await this.nappyModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('author', 'firstName lastName username')
      .populate('nappyChildEntries.child', 'fullName')
      .populate('nappyChildEntries.slots.staff', 'firstName lastName')
      .exec();

    if (!found) throw new NotFoundException('Nappy change record not found');
    this.checkAccess(found, currentUser);
    return found;
  }

  async update(id: string, dto: UpdateNappyChangeDto, currentUser?: User): Promise<NappyChange> {
    const existing = await this.nappyModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Nappy change record not found');

    this.checkAccess(existing, currentUser);

    const update: any = {};
    if (dto.date != null) update.date = this.parseDate(dto.date);
    if (dto.campus != null) update.campus = new Types.ObjectId(dto.campus);
    if (dto.room !== undefined) update.room = dto.room ? new Types.ObjectId(dto.room) : undefined;
    
    let changedChildIds: string[] = [];
    if (dto.nappyChildEntries != null) {
      update.nappyChildEntries = (dto.nappyChildEntries || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        slots: (entry.slots || []).map((s) => ({
          time: s.time,
          categories: s.categories || [],
          staff: s.staff ? new Types.ObjectId(s.staff) : undefined,
          doneTime: s.doneTime,
        })),
        specialRequirements: entry.specialRequirements,
      }));

      changedChildIds = this.getChangedChildIds(existing.nappyChildEntries || [], update.nappyChildEntries);
    }

    const updated = await this.nappyModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Nappy change record not found');
    
    if (dto.nappyChildEntries != null && changedChildIds.length > 0) {
      await this.syncWellbeingEntriesForChildren(updated, existing.author.toString(), changedChildIds);
    }
    
    return updated;
  }

  async findByDateCampusRoom(date: string, campus: string, room: string, currentUser?: User): Promise<{ message: string; data: NappyChange | null }> {
    const filters: any = {
      isDeleted: { $ne: true },
      date: this.parseDate(date),
      campus: new Types.ObjectId(campus),
      room: new Types.ObjectId(room),
    };

    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess = currentUser.rooms?.some((r) => compareObjectIds(r as any, new Types.ObjectId(room)));
      const hasCampusAccess = currentUser.campuses?.some((c) => compareObjectIds(c as any, new Types.ObjectId(campus)));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Nappy Change record');
      }
    }

    const found = await this.nappyModel
      .findOne(filters)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('author', 'firstName lastName username')
      .populate('nappyChildEntries.child', 'fullName')
      .populate('nappyChildEntries.slots.staff', 'firstName lastName')
      .exec();

    return {
      message: found ? 'Nappy change entries retrieved successfully' : 'No nappy change entries found for the given date, campus, and room',
      data: found,
    };
  }

  async remove(id: string, currentUser?: User): Promise<void> {
    const existing = await this.nappyModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Nappy change record not found');

    this.checkAccess(existing, currentUser);

    const res = await this.nappyModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );

    if (!res) throw new NotFoundException('Nappy change record not found');
    await this.deleteWellbeingEntries(id);
  }

  private async syncWellbeingEntries(nappyChange: NappyChange, authorId: string): Promise<void> {
    if (!nappyChange.nappyChildEntries?.length) return;

    const allChildIds = nappyChange.nappyChildEntries
      .filter((entry) => entry.child)
      .map((entry) => entry.child.toString());

    await this.syncWellbeingEntriesForChildren(nappyChange, authorId, allChildIds);
  }

  private async syncWellbeingEntriesForChildren(
    nappyChange: NappyChange,
    authorId: string,
    childIds: string[],
  ): Promise<void> {
    if (!childIds.length) return;

    await Promise.all(
      childIds.map(async (childId) => {
        const childEntry = nappyChange.nappyChildEntries?.find(
          (entry) => entry.child && entry.child.toString() === childId,
        );

        if (!childEntry || !childEntry.slots?.length) return;

        try {
          const payload = this.buildPayload(childEntry.slots);
          const existing = await this.wellbeingService.findByRefIdAndChild(
            nappyChange._id.toString(),
            childId,
            'nappy-change',
          );

          if (existing) {
            const hasChanged = this.hasPayloadChanged(existing.payload, payload);
            if (hasChanged) {
              await this.wellbeingService.update(
                existing._id.toString(),
                payload,
                `Nappy change updated - ${childEntry.slots.length} slots`,
              );
            }
          } else {
            await this.wellbeingService.create(
              'nappy-change',
              nappyChange._id.toString(),
              childId,
              payload,
              authorId,
              nappyChange.campus ? [nappyChange.campus.toString()] : [],
              `Nappy change - ${childEntry.slots.length} slots`,
            );
          }
        } catch (error) {
          console.error(`Failed to sync wellbeing entry for child ${childId}:`, error);
        }
      }),
    );
  }

  private getChangedChildIds(
    existingEntries: any[],
    newEntries: any[],
  ): string[] {
    const changedChildIds: string[] = [];
    const existingMap = new Map(
      existingEntries
        .filter((e) => e.child)
        .map((e) => [e.child.toString(), JSON.stringify(this.normalizeEntry(e))]),
    );

    newEntries.forEach((newEntry) => {
      if (!newEntry.child) return;

      const childId = newEntry.child.toString();
      const normalizedNew = JSON.stringify(this.normalizeEntry(newEntry));
      const existingNormalized = existingMap.get(childId);

      if (!existingNormalized || existingNormalized !== normalizedNew) {
        changedChildIds.push(childId);
      }
    });

    const existingChildIds = new Set(
      existingEntries.filter((e) => e.child).map((e) => e.child.toString()),
    );
    const newChildIds = new Set(
      newEntries.filter((e) => e.child).map((e) => e.child.toString()),
    );

    newChildIds.forEach((childId) => {
      if (!existingChildIds.has(childId)) {
        changedChildIds.push(childId);
      }
    });

    return [...new Set(changedChildIds)];
  }

  private normalizeEntry(entry: any): any {
    return {
      child: entry.child?.toString(),
      slots: (entry.slots || []).map((slot: any) => ({
        time: slot.time,
        categories: (slot.categories || []).sort(),
        staff: slot.staff?.toString(),
        doneTime: slot.doneTime || null,
      })),
      specialRequirements: entry.specialRequirements || null,
    };
  }

  private hasPayloadChanged(existingPayload: any, newPayload: any): boolean {
    if (!existingPayload || !newPayload) return true;

    const existingSlots = JSON.stringify(
      (existingPayload.slots || []).map((s: any) => ({
        time: s.time,
        categories: (s.categories || []).sort(),
        staff: s.staff?.toString(),
        doneTime: s.doneTime || null,
      })),
    );

    const newSlots = JSON.stringify(
      (newPayload.slots || []).map((s: any) => ({
        time: s.time,
        categories: (s.categories || []).sort(),
        staff: s.staff?.toString(),
        doneTime: s.doneTime || null,
      })),
    );

    return (
      existingSlots !== newSlots ||
      existingPayload.totalSlots !== newPayload.totalSlots ||
      existingPayload.completedSlots !== newPayload.completedSlots ||
      existingPayload.lastCompleted !== newPayload.lastCompleted
    );
  }

  private buildPayload(slots: any[]): any {
    const completedSlots = slots.filter((slot) => slot.doneTime);
    return {
      slots: slots.map((slot) => ({
        categories: slot.categories || [],
        doneTime: slot.doneTime || null,
        staff: slot.staff?.toString().trim() || null,
        time: slot.time,
      })),
      totalSlots: slots.length,
      completedSlots: completedSlots.length,
      lastCompleted: completedSlots.length > 0 ? completedSlots[completedSlots.length - 1].doneTime : null,
    };
  }

  private async deleteWellbeingEntries(nappyChangeId: string): Promise<void> {
    try {
      const entries = await this.wellbeingService.findByRefId(nappyChangeId, 'nappy-change');
      await Promise.all(entries.map((entry) => this.wellbeingService.remove(entry._id.toString())));
    } catch (error) {
      console.error('Failed to delete wellbeing entries for nappy change:', error);
    }
  }

  private buildFilters(campus?: string, roomId?: string, user?: User): any | null {
    const filters: any = { isDeleted: { $ne: true } };

    if (campus) filters.campus = new Types.ObjectId(campus);
    if (roomId) filters.room = new Types.ObjectId(roomId);

    if (!isAdministrator(user)) {
      if (user?.rooms?.length) {
        filters.room = filters.room || { $in: user.rooms };
      } else if (user?.campuses?.length) {
        Object.assign(filters, buildStrictCampusInFilterByIds(user.campuses as any, 'campus'));
      } else {
        return null;
      }
    }

    return filters;
  }

  private matchesSearch(doc: any, search: string): boolean {
    const lowered = search.trim().toLowerCase();
    const dateStr = new Date(doc.date).toDateString().toLowerCase();
    const campusName = (doc.campus?.name || '').toLowerCase();
    const roomName = (doc.room?.name || '').toLowerCase();
    const authorName = ([doc.author?.firstName, doc.author?.lastName].filter(Boolean).join(' ') || doc.author?.username || '').toLowerCase();

    return dateStr.includes(lowered) || campusName.includes(lowered) || roomName.includes(lowered) || authorName.includes(lowered);
  }

  private checkAccess(record: NappyChange, currentUser?: User): void {
    if (!currentUser || isAdministrator(currentUser)) return;

    const hasRoomAccess = currentUser.rooms?.some((r) => compareObjectIds(r as any, (record as any).room as any));
    const hasCampusAccess = currentUser.campuses?.some((c) => compareObjectIds(c as any, (record as any).campus as any));

    if (!hasRoomAccess && !hasCampusAccess) {
      throw new ForbiddenException('You do not have access to this Nappy Change record');
    }
  }

  private parseDate(dateString: string): Date {
    if (!dateString) {
      throw new Error('Date string is required');
    }

    const datePart = dateString.split('T')[0].split('Z')[0];
    if (!datePart || datePart.length !== 10) {
      throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }

    const parts = datePart.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(`Invalid date values: ${dateString}`);
    }

    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
    }

    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day}. Must be between 1 and 31`);
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
}
