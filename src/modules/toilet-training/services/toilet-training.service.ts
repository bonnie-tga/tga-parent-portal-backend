import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ToiletTraining } from '../schemas/toilet-training.schema';
import { CreateToiletTrainingDto } from '../dto/create-toilet-training.dto';
import { UpdateToiletTrainingDto } from '../dto/update-toilet-training.dto';
import { QueryToiletTrainingDto } from '../dto/query-toilet-training.dto';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { isAdministrator, buildStrictCampusInFilterByIds } from '../../../common/access/access-filter.util';
import { User } from '../../users/schemas/user.schema';
import { compareObjectIds } from '../../../utils/mongoose-helper';
import { WellbeingService } from '../../wellbeing/services/wellbeing.service';

@Injectable()
export class ToiletTrainingService {
  constructor(
    @InjectModel(ToiletTraining.name) private readonly toiletTrainingModel: Model<ToiletTraining>,
    private readonly wellbeingService: WellbeingService,
  ) { }

  async create(dto: CreateToiletTrainingDto, authorId: string): Promise<ToiletTraining> {
    const created = await this.toiletTrainingModel.create({
      date: new Date(dto.date),
      campus: new Types.ObjectId(dto.campus),
      room: dto.room ? new Types.ObjectId(dto.room) : undefined,
      author: new Types.ObjectId(authorId),
      toiletTrainingChildEntries: (dto.toiletTrainingChildEntries || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        slots: (entry.slots || []).map((s) => ({
          categories: s.categories || [],
          staff: s.staff ? new Types.ObjectId(s.staff) : undefined,
          doneTime: s.doneTime || '',
        })),
        comments: entry.comments || '',
      })),
    });

    await this.syncWellbeingEntries(created, authorId);
    return created;
  }

  async findAll(query: QueryToiletTrainingDto, user?: User): Promise<PaginatedResultDto<ToiletTraining>> {
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
      filters.room = new Types.ObjectId(roomId);
    }

    // Access control based on current user
    if (!isAdministrator(user)) {
      if (user?.rooms && user.rooms.length > 0) {
        if (!filters.room) {
          filters.room = { $in: user.rooms };
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
    let queryExec = this.toiletTrainingModel.find(filters)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('author', 'firstName lastName username')
      .populate('toiletTrainingChildEntries.child', 'fullName')
      .populate('toiletTrainingChildEntries.slots.staff', 'firstName lastName')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      queryExec.exec(),
      this.toiletTrainingModel.countDocuments(filters).exec(),
    ]);

    // Apply in-memory search across populated fields if search present
    const lowered = search.trim().toLowerCase();
    const filtered = lowered
      ? data.filter((doc: any) => {
        const dateStr = new Date(doc.date).toDateString().toLowerCase();
        const campusName = (doc.campus?.name || '').toLowerCase();
        const roomName = (doc.room?.name || '').toLowerCase();
        const authorName = ([doc.author?.firstName, doc.author?.lastName].filter(Boolean).join(' ') || doc.author?.username || '').toLowerCase();
        return (
          dateStr.includes(lowered) ||
          campusName.includes(lowered) ||
          roomName.includes(lowered) ||
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

  async findOne(id: string, currentUser?: User): Promise<ToiletTraining> {
    const found = await this.toiletTrainingModel.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('author', 'firstName lastName username')
      .populate('toiletTrainingChildEntries.child', 'fullName')
      .populate('toiletTrainingChildEntries.slots.staff', 'firstName lastName')
      .exec();
    if (!found) throw new NotFoundException('Toilet training record not found');

    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (found as any).room as any));
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (found as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Toilet Training record');
      }
    }
    return found;
  }

  async update(id: string, dto: UpdateToiletTrainingDto, currentUser?: User): Promise<ToiletTraining> {
    const existing = await this.toiletTrainingModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Toilet training record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to update this Toilet Training record');
      }
    }
    const update: any = {};
    if (dto.date != null) update.date = new Date(dto.date);
    if (dto.campus != null) update.campus = new Types.ObjectId(dto.campus);
    if (dto.room !== undefined) update.room = dto.room ? new Types.ObjectId(dto.room) : undefined;
    
    let changedChildIds: string[] = [];
    if (dto.toiletTrainingChildEntries != null) {
      update.toiletTrainingChildEntries = (dto.toiletTrainingChildEntries || []).map((entry) => ({
        child: entry.child ? new Types.ObjectId(entry.child) : undefined,
        slots: (entry.slots || []).map((s) => ({
          categories: s.categories || [],
          staff: s.staff ? new Types.ObjectId(s.staff) : undefined,
          doneTime: s.doneTime || '',
        })),
        comments: entry.comments || '',
      }));

      changedChildIds = this.getChangedChildIds(existing.toiletTrainingChildEntries || [], update.toiletTrainingChildEntries);
    }

    const updated = await this.toiletTrainingModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Toilet training record not found');

    if (dto.toiletTrainingChildEntries != null && changedChildIds.length > 0) {
      await this.syncWellbeingEntriesForChildren(updated, existing.author.toString(), changedChildIds);
    }

    return updated;
  }

  async remove(id: string, currentUser?: User): Promise<void> {
    const existing = await this.toiletTrainingModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!existing) throw new NotFoundException('Toilet training record not found');
    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess =
        currentUser.rooms && currentUser.rooms.some((r) => compareObjectIds(r as any, (existing as any).room as any));
      const hasCampusAccess =
        currentUser.campuses && currentUser.campuses.some((c) => compareObjectIds(c as any, (existing as any).campus as any));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have permission to delete this Toilet Training record');
      }
    }
    const res = await this.toiletTrainingModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!res) throw new NotFoundException('Toilet training record not found');
    await this.deleteWellbeingEntries(id);
  }

  async findByDateCampusRoom(date: string, campus: string, room: string, currentUser?: User): Promise<{ message: string; data: ToiletTraining | null }> {
    // Parse date and normalize to start of day for accurate comparison
    const dateObj = new Date(date);
    const normalizedDate = new Date(Date.UTC(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
      0, 0, 0, 0
    ));

    const filters: any = {
      isDeleted: { $ne: true },
      date: normalizedDate,
      campus: new Types.ObjectId(campus),
      room: new Types.ObjectId(room),
    };

    if (currentUser && !isAdministrator(currentUser)) {
      const hasRoomAccess = currentUser.rooms?.some((r) => compareObjectIds(r as any, new Types.ObjectId(room)));
      const hasCampusAccess = currentUser.campuses?.some((c) => compareObjectIds(c as any, new Types.ObjectId(campus)));
      if (!hasRoomAccess && !hasCampusAccess) {
        throw new ForbiddenException('You do not have access to this Toilet Training record');
      }
    }

    const found = await this.toiletTrainingModel
      .findOne(filters)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('author', 'firstName lastName username')
      .populate('toiletTrainingChildEntries.child', 'fullName')
      .populate('toiletTrainingChildEntries.slots.staff', 'firstName lastName')
      .exec();

    return {
      message: found ? 'Toilet training entries retrieved successfully' : 'No toilet training entries found for the given date, campus, and room',
      data: found,
    };
  }

  private async syncWellbeingEntries(toiletTraining: ToiletTraining, authorId: string): Promise<void> {
    if (!toiletTraining.toiletTrainingChildEntries?.length) return;

    const allChildIds = toiletTraining.toiletTrainingChildEntries
      .filter((entry) => entry.child)
      .map((entry) => entry.child.toString());

    await this.syncWellbeingEntriesForChildren(toiletTraining, authorId, allChildIds);
  }

  private async syncWellbeingEntriesForChildren(
    toiletTraining: ToiletTraining,
    authorId: string,
    childIds: string[],
  ): Promise<void> {
    if (!childIds.length) return;

    await Promise.all(
      childIds.map(async (childId) => {
        const childEntry = toiletTraining.toiletTrainingChildEntries?.find(
          (entry) => entry.child && entry.child.toString() === childId,
        );

        if (!childEntry || !childEntry.slots?.length) return;

        try {
          const payload = this.buildPayload(childEntry.slots);
          const existing = await this.wellbeingService.findByRefIdAndChild(
            toiletTraining._id.toString(),
            childId,
            'toilet-training',
          );

          if (existing) {
            const hasChanged = this.hasPayloadChanged(existing.payload, payload);
            if (hasChanged) {
              await this.wellbeingService.update(
                existing._id.toString(),
                payload,
                `Toilet training updated - ${childEntry.slots.length} slots`,
              );
            }
          } else {
            await this.wellbeingService.create(
              'toilet-training',
              toiletTraining._id.toString(),
              childId,
              payload,
              authorId,
              toiletTraining.campus ? [toiletTraining.campus.toString()] : [],
              `Toilet training - ${childEntry.slots.length} slots`,
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
        categories: (slot.categories || []).sort(),
        staff: slot.staff?.toString(),
        doneTime: slot.doneTime || null,
      })),
      comments: entry.comments || null,
    };
  }

  private hasPayloadChanged(existingPayload: any, newPayload: any): boolean {
    if (!existingPayload || !newPayload) return true;

    const existingSlots = JSON.stringify(
      (existingPayload.slots || []).map((s: any) => ({
        categories: (s.categories || []).sort(),
        staff: s.staff?.toString(),
        doneTime: s.doneTime || null,
      })),
    );

    const newSlots = JSON.stringify(
      (newPayload.slots || []).map((s: any) => ({
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
    const completedSlots = slots.filter((slot) => slot.doneTime && slot.doneTime.trim());
    return {
      slots: slots.map((slot) => ({
        categories: slot.categories || [],
        doneTime: slot.doneTime || null,
        staff: slot.staff?.toString().trim() || null,
      })),
      totalSlots: slots.length,
      completedSlots: completedSlots.length,
      lastCompleted: completedSlots.length > 0 ? completedSlots[completedSlots.length - 1].doneTime : null,
    };
  }

  private async deleteWellbeingEntries(toiletTrainingId: string): Promise<void> {
    try {
      const entries = await this.wellbeingService.findByRefId(toiletTrainingId, 'toilet-training');
      await Promise.all(entries.map((entry) => this.wellbeingService.remove(entry._id.toString())));
    } catch (error) {
      console.error('Failed to delete wellbeing entries for toilet training:', error);
    }
  }
}


