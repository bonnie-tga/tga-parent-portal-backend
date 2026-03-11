import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import { Event, EventStatus } from '../schema/event.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { isAdministrator } from 'src/common/access/access-filter.util';
import { CreateEventDto } from '../dto/create-event.dto';
import { QueryEventDto } from '../dto/query-event.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Helpers
  private extractCampusIds(campuses: any[]): string[] {
    if (!campuses || campuses.length === 0) return [];
    return campuses
      .map((campus: any) => {
        if (!campus) return undefined;
        if (campus instanceof Types.ObjectId) return campus.toString();
        if (typeof campus === 'object' && campus._id) return campus._id.toString();
        return String(campus);
      })
      .filter((id): id is string => Boolean(id));
  }

  private extractUserCampusObjectIds(user?: User): Types.ObjectId[] {
    if (!user || isAdministrator(user)) return [];
    const campuses = (user as any)?.campuses || [];
    const uniqueStrings: string[] = Array.from(
      new Set(
        campuses
          .map((c: any) => (c != null ? String(c) : ''))
          .filter((v: string) => v.length > 0),
      ),
    );
    return uniqueStrings.map((id: string) => new Types.ObjectId(id));
  }

  private computeVisibilityRange(source: {
    startDate?: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
  }): { from: Date | null; until: Date | null } {
    let from: Date | null = null;
    if (source.startDate) {
      from = new Date(source.startDate);
      if (source.startTime && typeof source.startTime === 'string') {
        const [hs, ms] = source.startTime.split(':');
        const h = Number(hs);
        const m = Number(ms);
        if (!Number.isNaN(h) && !Number.isNaN(m)) from.setHours(h, m, 0, 0);
      } else {
        from.setHours(0, 0, 0, 0);
      }
    }

    const base = source.endDate || source.startDate;
    let until: Date | null = null;
    if (base) {
      until = new Date(base);
      if (source.endTime && typeof source.endTime === 'string') {
        const [hs, ms] = source.endTime.split(':');
        const h = Number(hs);
        const m = Number(ms);
        if (!Number.isNaN(h) && !Number.isNaN(m)) until.setHours(h, m, 59, 999);
        else until.setHours(23, 59, 59, 999);
      } else {
        until.setHours(23, 59, 59, 999);
      }
    }

    return { from, until };
  }

  async create(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    const doc = new this.eventModel({
      ...createEventDto,
      campus: createEventDto.campus.map((id) => new Types.ObjectId(id)),
      room: (createEventDto.room || []).map((id) => new Types.ObjectId(id)),
      startDate: createEventDto.startDate ? new Date(createEventDto.startDate) : undefined,
      endDate: createEventDto.endDate ? new Date(createEventDto.endDate) : undefined,
      createdBy: new Types.ObjectId(userId),
      // if status is Published and no publishedDate, set now
      publishedDate:
        (createEventDto as any).publishedDate
          ? new Date((createEventDto as any).publishedDate as any)
          : createEventDto.status === EventStatus.PUBLISHED
          ? new Date()
          : undefined,
    });
    const saved = await doc.save();
    // Send notifications to users in the relevant campuses when published
    try {
      const campusIds = this.extractCampusIds(saved.campus as any[]);
      if (saved.status === EventStatus.PUBLISHED) {
        if (campusIds.length === 0) {
          // For all campuses, skip campus-based notifications (sendByCampus needs a campusId)
        } else {
          for (const campusId of campusIds) {
            try {
              await this.notificationsService.sendByCampus(
                campusId,
                'New Event' + (saved.title ? `: ${saved.title}` : ''),
                saved.shortDescription || saved.title,
                {
                  refModel: 'Event',
                  relatedEntityId: saved._id.toString(),
                  event: 'created',
                  meta: { url: `/events/${saved._id.toString()}` },
                  recipientRole: 'parent',
                },
              );
            } catch (notificationError) {
              console.error(`Failed to send notifications for campus ${campusId}:`, notificationError);
            }
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Event notifications failed:', e);
    }
    return saved;
  }

  async findAll(query: QueryEventDto = {} as any, currentUser?: User): Promise<{ data: Event[]; total: number; page: number; limit: number; }> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      campusName,
      status,
      rsvpRequired,
      campusIds,
    } = query;

    const filter: any = { isDeleted: false };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (Array.isArray(status) && status.length > 0) {
      filter.status = { $in: status };
    }

    if (typeof rsvpRequired === 'boolean') {
      filter.rsvpRequired = rsvpRequired;
    }

    if (campusIds && campusIds.length > 0) {
      filter.campus = { $in: campusIds.map((id) => new Types.ObjectId(String(id))) };
    }

    // Scope by current user campuses (non-admin)
    const allowed = this.extractUserCampusObjectIds(currentUser as any);
    if (allowed.length > 0) {
      filter.$or = [
        { campus: { $in: allowed } },
        { campus: { $exists: false } },
        { campus: { $size: 0 } },
      ];
    }

    // campusName textual filter via lookup
    const pipeline: any[] = [
      { $match: filter },
      { $lookup: { from: 'campuses', localField: 'campus', foreignField: '_id', as: 'campus' } },
    ];

    if (campusName) {
      pipeline.push({ $match: { 'campus.name': { $regex: campusName, $options: 'i' } } });
    }

    // Sort
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    pipeline.push({ $sort: sort });

    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $facet: {
      data: [ { $skip: skip }, { $limit: limit } ],
      total: [ { $count: 'count' } ]
    }});

    const result = await (this.eventModel as any).aggregate(pipeline).exec();
    const dataRaw = (result?.[0]?.data || []) as any[];
    const total = result?.[0]?.total?.[0]?.count || 0;

    // Re-hydrate and populate refs similarly to find
    const ids = dataRaw.map((d) => d._id);
    const data = await this.eventModel
      .find({ _id: { $in: ids } })
      .sort(sort)
      .populate('createdBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .exec();

    return { data, total, page, limit };
  }

  async findOne(id: string, currentUser?: User): Promise<Event> {
    const filter: any = { _id: id, isDeleted: false };
    const allowed = this.extractUserCampusObjectIds(currentUser as any);
    if (allowed.length > 0) {
      filter.$or = [
        { campus: { $in: allowed } },
        { campus: { $exists: false } },
        { campus: { $size: 0 } },
      ];
    }
    const event = await this.eventModel
      .findOne(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .exec();
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: Partial<CreateEventDto>): Promise<Event> {
    const toUpdate: any = { ...updateEventDto };
    if (toUpdate.campus) {
      toUpdate.campus = toUpdate.campus.map((c: string) => new Types.ObjectId(c));
    }
    if (toUpdate.room) {
      toUpdate.room = toUpdate.room.map((r: string) => new Types.ObjectId(r));
    }
    if (toUpdate.startDate) {
      toUpdate.startDate = new Date(toUpdate.startDate as any);
    }
    if (toUpdate.endDate) {
      toUpdate.endDate = new Date(toUpdate.endDate as any);
    }

    const updated = await this.eventModel
      .findByIdAndUpdate(id, toUpdate, { new: true })
      .populate('createdBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .exec();
    if (!updated) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    // Feed updates handled by AutoFeed interceptor
    return updated;
  }

  async listPublishedByCampus(campusId: string, currentUser?: User): Promise<Event[]> {
    const campusObjectId = new Types.ObjectId(String(campusId));
    const filter: any = {
      isDeleted: false,
      status: EventStatus.PUBLISHED,
      $or: [
        { campus: { $in: [campusObjectId] } },
        { campus: { $exists: false } },
        { campus: { $size: 0 } },
      ],
    };

    // Ensure user has access to this campus unless admin
    const allowed = this.extractUserCampusObjectIds(currentUser as any);
    if (allowed.length > 0 && !allowed.some((c) => c.equals(campusObjectId))) {
      return [];
    }

    return this.eventModel
      .find(filter)
      .sort({ startDate: 1, createdAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('campus', 'name')
      .populate('room', 'name')
      .exec();
  }

  async remove(id: string): Promise<void> {
    const updated = await this.eventModel.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    ).exec();
    if (!updated) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    // Feed updates handled by AutoFeed interceptor
  }

  async toggleLike(
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    likes: number;
    parentLikes: number;
    totalLikes: number;
    liked: boolean;
    message: string;
  }> {
    const event = await this.eventModel.findOne({ _id: eventId, isDeleted: false }).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isParent = userRole === UserRole.PARENT;
    const likeList = isParent ? event.likedByParents : event.likedByUsers;
    const index = likeList.findIndex((id) => id.toString() === userId);

    let liked: boolean;
    if (index >= 0) {
      likeList.splice(index, 1);
      liked = false;
    } else {
      const oid = new Types.ObjectId(userId) as unknown as MongooseSchema.Types.ObjectId;
      likeList.push(oid);
      liked = true;
    }

    event.totalLikes = (event.likedByUsers?.length || 0) + (event.likedByParents?.length || 0);
    await event.save();

    return {
      likes: event.likedByUsers.length,
      parentLikes: event.likedByParents.length,
      totalLikes: event.totalLikes,
      liked,
      message: liked ? 'Liked successfully' : 'Unliked successfully',
    };
  }
}