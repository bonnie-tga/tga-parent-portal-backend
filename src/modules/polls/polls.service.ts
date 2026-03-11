import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Poll, PollDocument } from './schemas/poll.schema';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { QueryPollDto } from './dto/query-poll.dto';

import { NotificationsService } from '../notifications/services/notifications.service';
import { User } from '../users/schemas/user.schema';
import { isAdministrator, buildPollAccessFilter } from 'src/common/access/access-filter.util';

@Injectable()
export class PollsService {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createPollDto: CreatePollDto, userId: string): Promise<Poll> {
    // Validate campus targeting
    if (!createPollDto.isForAllCampuses && (!createPollDto.campuses || createPollDto.campuses.length === 0)) {
      throw new BadRequestException(
        'Must specify campuses or set isForAllCampuses to true',
      );
    }

    const poll = new this.pollModel({
      ...createPollDto,
      campuses: createPollDto.campuses?.map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(userId),
      pollDate: createPollDto.pollDate ? new Date(createPollDto.pollDate) : new Date(),
    });

    const savedPoll = await poll.save();

    // Send notifications to users in the relevant campuses (parents only)
    try {
      if (savedPoll.status === 'active') {
        const campusIds = (savedPoll.isForAllCampuses ? [] : savedPoll.campuses || [])
          .map((id: any) => (id instanceof Types.ObjectId ? id.toString() : String(id)))
          .filter(Boolean);

        if (campusIds.length === 0) {
          // For all campuses, skip because sendByCampus requires a specific campusId
        } else {
          for (const campusId of campusIds) {
            try {
              await this.notificationsService.sendByCampus(
                campusId,
                'New Poll Available',
                `${savedPoll.title} - Please share your opinion!`,
                {
                  refModel: 'Poll',
                  relatedEntityId: (savedPoll as any)._id.toString(),
                  event: 'created',
                  recipientRole: 'parent',
                },
              );
            } catch (notificationError) {
              console.error(`Failed to send poll notifications for campus ${campusId}:`, notificationError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send poll notifications:', error);
    }

    return savedPoll;
  }

  async findAll(queryDto: QueryPollDto, userCampuses?: Types.ObjectId[], currentUser?: User): Promise<Poll[]> {
    const { status, campusId, search, limit = 20, skip = 0 } = queryDto;

    const filter: any = {
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    // Strict campus filtering (non-admin): user's campuses or all-campus polls
    if (!currentUser || !isAdministrator(currentUser)) {
      if (userCampuses && userCampuses.length > 0) {
        filter.$or = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      } else {
        filter._id = { $in: [] } as any;
      }
    }

    // Additional campus filter
    if (campusId) {
      const cid = new Types.ObjectId(campusId);
      if (!currentUser || !isAdministrator(currentUser)) {
        const allowed = new Set((userCampuses || []).map((c) => c?.toString()));
        if (allowed.has(cid.toString())) {
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: [{ campuses: cid }, { isForAllCampuses: true }] });
        } else {
          filter._id = { $in: [] } as any;
        }
      } else {
        // admin: allow specific campusId or global
        filter.$or = [{ campuses: cid }, { isForAllCampuses: true }];
      }
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    return this.pollModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email')
      .populate('campuses', 'name')
      .lean()
      .exec();
  }

  async findActiveForUser(userCampuses: Types.ObjectId[], currentUser?: User): Promise<Poll[]> {
    const filter: any = {
      status: 'active',
      isDeleted: false,
    };
    if (!currentUser || !isAdministrator(currentUser)) {
      if (userCampuses && userCampuses.length > 0) {
        filter.$or = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      } else {
        filter._id = { $in: [] } as any;
      }
    }
    return this.pollModel.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('campuses', 'name')
      .lean()
      .exec();
  }

  async findOne(id: string, userCampuses?: Types.ObjectId[], currentUser?: User): Promise<Poll> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      isDeleted: false,
    };

    if (!currentUser || !isAdministrator(currentUser)) {
      if (userCampuses && userCampuses.length > 0) {
        filter.$or = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      } else {
        filter._id = { $in: [] } as any;
      }
    }

    const poll = await this.pollModel
      .findOne(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('campuses', 'name')
      .lean()
      .exec();

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return poll;
  }

  async update(id: string, updatePollDto: UpdatePollDto): Promise<Poll> {
    const poll = await this.pollModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    Object.assign(poll, {
      ...updatePollDto,
      campuses: updatePollDto.campuses?.map((id) => new Types.ObjectId(id)),
      pollDate: updatePollDto.pollDate ? new Date(updatePollDto.pollDate) : poll.pollDate,
    });

    const updatedPoll = await poll.save();

    // Feed updates handled by AutoFeed interceptor

    // Send notifications if the poll is active and either status changed to active or campuses updated
    try {
      const wasStatusUpdated = updatePollDto.status !== undefined && updatePollDto.status === 'active';
      const campusesChanged = updatePollDto.campuses !== undefined;

      if (updatedPoll.status === 'active' && (wasStatusUpdated || campusesChanged)) {
        const campusIds = (updatedPoll.isForAllCampuses ? [] : updatedPoll.campuses || [])
          .map((id: any) => (id instanceof Types.ObjectId ? id.toString() : String(id)))
          .filter(Boolean);

        if (campusIds.length === 0) {
          // For all campuses, skip because sendByCampus requires a specific campusId
        } else {
          for (const campusId of campusIds) {
            try {
              await this.notificationsService.sendByCampus(
                campusId,
                wasStatusUpdated ? 'New Poll Available' : 'Poll Updated',
                `${updatedPoll.title} - Please share your opinion!`,
                {
                  refModel: 'Poll',
                  relatedEntityId: (updatedPoll as any)._id.toString(),
                  event: wasStatusUpdated ? 'created' : 'updated',
                  recipientRole: 'parent',
                },
              );
            } catch (notificationError) {
              console.error(`Failed to send poll notifications for campus ${campusId}:`, notificationError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send notifications for poll update:', error);
    }

    return updatedPoll;
  }

  async archive(id: string): Promise<Poll> {
    const poll = await this.pollModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    poll.status = 'archived';
    const savedPoll = await poll.save();

    // Feed updates handled by AutoFeed interceptor

    return savedPoll;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pollModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { isDeleted: true } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Poll not found');
    }

    // Feed updates handled by AutoFeed interceptor
  }

  async isValidPoll(
    pollId: string,
    userCampuses: Types.ObjectId[],
    currentUser?: User,
  ): Promise<Poll> {
    const filter: any = {
      _id: new Types.ObjectId(pollId),
      status: 'active',
      isDeleted: false,
    };
    if (!currentUser || !isAdministrator(currentUser)) {
      if (userCampuses && userCampuses.length > 0) {
        filter.$or = [
          { campuses: { $in: userCampuses } },
          { isForAllCampuses: true },
        ];
      } else {
        filter._id = { $in: [] } as any;
      }
    }
    const poll = await this.pollModel.findOne(filter);

    if (!poll) {
      throw new NotFoundException(
        'Poll not found or not available for your campus',
      );
    }

    return poll;
  }
}

