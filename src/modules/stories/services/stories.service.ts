import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Story,
  StoryStatus,
} from '../schemas/story.schema';
import {
  ApiStoryStatus,
  CreateStoryDto,
} from '../dto/create-story.dto';
import { UpdateStoryDto } from '../dto/update-story.dto';
import { QueryStoryDto } from '../dto/query-story.dto';
import { User } from '../../users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Story.name)
    private readonly storyModel: Model<Story>,
    @InjectModel(Child.name)
    private readonly childModel: Model<Child>,
  ) {}

  async create(dto: CreateStoryDto, currentUser: User): Promise<Story> {
    const createdPayload: Record<string, unknown> = {
      title: dto.title,
      campus: new Types.ObjectId(dto.campus),
      rooms: dto.rooms.map((roomId) => new Types.ObjectId(roomId)),
      media: dto.media ?? [],
      videoPoster: dto.videoPoster,
      createdBy: currentUser._id,
      isDeleted: false,
    };
    const payloadStatus =
      dto.status === undefined
        ? StoryStatus.DRAFT
        : dto.status === ApiStoryStatus.PUBLISHED
        ? StoryStatus.PUBLISHED
        : StoryStatus.DRAFT;
    createdPayload.status = payloadStatus;
    if (payloadStatus === StoryStatus.PUBLISHED) {
      createdPayload.publishedAt = new Date();
    }
    const created = new this.storyModel(createdPayload);
    return created.save();
  }

  async findAll(query?: QueryStoryDto): Promise<Story[]> {
    type DateRange = { $gte: Date; $lt: Date };
    type FindAllFilter = {
      isDeleted: boolean;
      campus?: Types.ObjectId;
      rooms?: Types.ObjectId;
      status?: StoryStatus;
      publishedAt?: DateRange;
    };
    const filter: FindAllFilter = { isDeleted: false };
    if (query?.campus) {
      filter.campus = new Types.ObjectId(query.campus);
    }
    if (query?.room) {
      filter.rooms = new Types.ObjectId(query.room);
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
        filter.publishedAt = { $gte: startDate, $lt: endDate };
      }
    }
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.limit ?? 10;
    const skip = (pageNumber - 1) * pageSize;
    const mongoFilter: Record<string, unknown> = { ...filter };
    if (query?.room) {
      mongoFilter.rooms = { $in: [new Types.ObjectId(query.room)] };
    }
    if (query?.search) {
      const searchTerm = query.search.trim();
      if (!searchTerm) {
        return [];
      }
      const searchRegex = new RegExp(searchTerm, 'i');
      const allResults = await this.storyModel
        .find(mongoFilter)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('rooms', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec();
      const filtered = allResults.filter((item) =>
        typeof item.title === 'string' && searchRegex.test(item.title),
      );
      const start = skip;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
    return this.storyModel
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string): Promise<Story> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid story ID format');
    }
    const story = await this.storyModel
      .findOne({ _id: id, isDeleted: false })
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    return story;
  }

  async update(id: string, dto: UpdateStoryDto, currentUser: User): Promise<Story> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid story ID format');
    }
    const updatePayload: Record<string, unknown> = { updatedBy: currentUser._id };
    if (dto.title !== undefined) {
      updatePayload.title = dto.title;
    }
    if (dto.campus) {
      updatePayload.campus = new Types.ObjectId(dto.campus);
    }
    if (dto.rooms) {
      updatePayload.rooms = dto.rooms.map((roomId) => new Types.ObjectId(roomId));
    }
    if (dto.media !== undefined) {
      updatePayload.media = dto.media;
    }
    if (dto.videoPoster !== undefined) {
      updatePayload.videoPoster = dto.videoPoster;
    }
    if (dto.status !== undefined) {
      updatePayload.status =
        dto.status === ApiStoryStatus.PUBLISHED ? StoryStatus.PUBLISHED : StoryStatus.DRAFT;
      if (dto.status === ApiStoryStatus.PUBLISHED) {
        updatePayload.publishedAt = new Date();
      } else {
        updatePayload.publishedAt = undefined;
      }
    }
    const updated = await this.storyModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updatePayload, { new: true })
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
    if (!updated) {
      throw new NotFoundException('Story not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid story ID format');
    }
    const removed = await this.storyModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
    if (!removed) {
      throw new NotFoundException('Story not found');
    }
  }

  async findActiveForParent(currentUser: User): Promise<Story[]> {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const children = await this.childModel
      .find({ parents: currentUser._id, isActive: true, isArchived: false })
      .select('campus room')
      .lean()
      .exec();
    if (!children.length) {
      return [];
    }
    const campusIds = Array.from(
      new Set(children.map((child) => String(child.campus))),
    ).map((id) => new Types.ObjectId(id));
    const roomIds = Array.from(
      new Set(children.map((child) => String(child.room))),
    ).map((id) => new Types.ObjectId(id));
    const filter: Record<string, unknown> = {
      isDeleted: false,
      status: StoryStatus.PUBLISHED,
      publishedAt: { $gte: since },
      campus: { $in: campusIds },
      rooms: { $in: roomIds },
    };
    return this.storyModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .populate('campus', 'name')
      .populate('rooms', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { isDeleted: false, publishedAt: { $type: 'date' } } },
      {
        $group: {
          _id: {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' },
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
    const results = await this.storyModel.aggregate(pipeline).exec();
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

