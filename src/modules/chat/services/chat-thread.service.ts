import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { ChatThread, ChatThreadType } from '../schemas/chat-thread.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { ParentChat } from '../../parent-chat/schemas/parent-chat.schema';
import { AccountChat } from '../../account-chat/schemas/account-chat.schema';
import { ManagementChat } from '../../management-chat/schemas/management-chat.schema';
import { StaffChat } from '../../staff-chat/schemas/staff-chat.schema';
import { TeamChat } from '../../team-chat/schemas/team-chat.schema';
import { CreateChatThreadDto } from '../dto/create-chat-thread.dto';
import { QueryChatThreadDto } from '../dto/query-chat-thread.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { validateChatThreadAccess, checkChatThreadAccess, checkChatStatusForParent } from '../utils/chat-access.util';
import { buildCampusFilter } from 'src/common/access/access-filter.util';

@Injectable()
export class ChatThreadService {
  constructor(
    @InjectModel(ChatThread.name) private chatThreadModel: Model<ChatThread>,
    @InjectModel(ParentChat.name) private parentChatModel: Model<ParentChat>,
    @InjectModel(AccountChat.name) private accountChatModel: Model<AccountChat>,
    @InjectModel(ManagementChat.name) private managementChatModel: Model<ManagementChat>,
    @InjectModel(StaffChat.name) private staffChatModel: Model<StaffChat>,
    @InjectModel(TeamChat.name) private teamChatModel: Model<TeamChat>,
  ) {}

  async create(dto: CreateChatThreadDto, currentUser: User): Promise<ChatThread> {
    if (dto.type === ChatThreadType.PARENT) {
      if (!dto.campus || !dto.room) {
        throw new NotFoundException('Campus and Room are required for PARENT chat type');
      }
    }

    if (
      dto.type === ChatThreadType.ACCOUNT ||
      dto.type === ChatThreadType.TEAM ||
      dto.type === ChatThreadType.MANAGEMENT
    ) {
      if (!dto.members || dto.members.length === 0) {
        throw new NotFoundException('Members are required for this chat type');
      }
    }

    const thread = new this.chatThreadModel({
      type: dto.type,
      refId: dto.refId ? new Types.ObjectId(dto.refId) : undefined,
      refModel: dto.refModel,
      campus: dto.campus ? new Types.ObjectId(dto.campus) : undefined,
      room: dto.room ? new Types.ObjectId(dto.room) : undefined,
      members: dto.members ? dto.members.map((id) => new Types.ObjectId(id)) : [],
      status: dto.status || 'Draft',
      decisionStatus: dto.decisionStatus || 'Open',
      metadata: dto.metadata || {},
      createdBy: currentUser._id,
    });

    await thread.save();

    const populated = await this.chatThreadModel
      .findById(thread._id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (populated?.refId && populated?.refModel) {
      await populated.populate('refId');
    }

    return populated;
  }

  async findAll(query: QueryChatThreadDto, currentUser: User): Promise<PaginatedDto<ChatThread>> {
    const { page = 1, limit = 10, type, campus, room, status, decisionStatus } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<ChatThread> = {
      isDeleted: { $ne: true },
    };

    if (type) {
      filter.type = type;
    }
    if (campus) {
      filter.campus = Types.ObjectId.isValid(campus) ? new Types.ObjectId(campus) : campus;
    }
    if (room) {
      filter.room = Types.ObjectId.isValid(room) ? new Types.ObjectId(room) : room;
    }
    if (status) {
      filter.status = status;
    }
    if (decisionStatus) {
      filter.decisionStatus = decisionStatus;
    }

    if (currentUser.role === UserRole.ADMINISTRATOR) {
    } else if (currentUser.role === UserRole.AREA_MANAGER || currentUser.role === UserRole.DIRECTOR) {
      const campusIds = (currentUser.campuses || []).map((c) => new Types.ObjectId(c.toString()));
      if (campusIds.length > 0) {
        filter.campus = { $in: campusIds };
      } else {
        filter._id = { $in: [] };
      }
    } else if (
      currentUser.role === UserRole.ASSISTANT_DIRECTOR ||
      currentUser.role === UserRole.EDUCATIONAL_LEADER ||
      currentUser.role === UserRole.CENTRE_LOGIN
    ) {
      const campusIds = (currentUser.campuses || []).map((c) => new Types.ObjectId(c.toString()));
      if (campusIds.length === 1) {
        filter.campus = campusIds[0];
      } else {
        filter._id = { $in: [] };
      }
    } else if (currentUser.role === UserRole.ROOM_LOGIN || currentUser.role === UserRole.STAFF) {
      const roomIds = (currentUser.rooms || []).map((r) => new Types.ObjectId(r.toString()));
      if (roomIds.length > 0) {
        filter.room = { $in: roomIds };
      } else {
        filter._id = { $in: [] };
      }
    } else if (currentUser.role === UserRole.PARENT) {
      filter.type = ChatThreadType.PARENT;
      filter.members = { $in: [currentUser._id] };
    }

    const [data, totalCount] = await Promise.all([
      this.chatThreadModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .exec(),
      this.chatThreadModel.countDocuments(filter),
    ]);

    for (const thread of data) {
      if (thread.refId && thread.refModel) {
        await thread.populate('refId');
      }
    }

    const accessibleThreads = data.filter((thread) => validateChatThreadAccess(thread, currentUser));

    return {
      data: accessibleThreads,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findById(id: string, currentUser: User): Promise<ChatThread> {
    const thread = await this.chatThreadModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('members', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    if (thread.refId && thread.refModel) {
      await thread.populate('refId');
    }

    checkChatThreadAccess(thread, currentUser);
    await checkChatStatusForParent(thread, currentUser, this.parentChatModel, this.accountChatModel, this.managementChatModel);

    return thread;
  }

  async findByRefId(refId: string, refModel: string): Promise<ChatThread | null> {
    return this.chatThreadModel
      .findOne({
        refId: new Types.ObjectId(refId),
        refModel,
        isDeleted: { $ne: true },
      })
      .exec();
  }

  async getThreadIdByParentChatId(parentChatId: string): Promise<string | null> {
    const thread = await this.findByRefId(parentChatId, 'ParentChat');
    return thread ? thread._id.toString() : null;
  }

  async getThreadIdByManagementChatId(managementChatId: string): Promise<string | null> {
    const thread = await this.findByRefId(managementChatId, 'ManagementChat');
    return thread ? thread._id.toString() : null;
  }

  async getThreadIdByStaffChatId(staffChatId: string): Promise<string | null> {
    const thread = await this.findByRefId(staffChatId, 'StaffChat');
    return thread ? thread._id.toString() : null;
  }

  async getThreadIdByTeamChatId(teamChatId: string): Promise<string | null> {
    const thread = await this.findByRefId(teamChatId, 'TeamChat');
    return thread ? thread._id.toString() : null;
  }
}
