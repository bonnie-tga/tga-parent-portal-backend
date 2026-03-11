import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { TeamChat, TeamChatStatus, TeamChatDecisionStatus } from '../schemas/team-chat.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { QueryTeamChatDto } from '../dto/query-team-chat.dto';
import { CreateTeamChatDto } from '../dto/create-team-chat.dto';
import { UpdateTeamChatDto } from '../dto/update-team-chat.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { ChatThreadService } from '../../chat/services/chat-thread.service';
import { ChatMessageService } from '../../chat/services/chat-message.service';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../../chat/schemas/chat-thread.schema';
import { isAdministrator, hasCampusAccess, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';

type TeamChatWithUnreadCount = any;

@Injectable()
export class TeamChatService {
  constructor(
    @InjectModel(TeamChat.name) private teamChatModel: Model<TeamChat>,
    @InjectModel(User.name) private userModel: Model<User>,
    private chatThreadService: ChatThreadService,
    private chatMessageService: ChatMessageService,
  ) {}

  async create(dto: CreateTeamChatDto, currentUser: User): Promise<TeamChat> {
    if (currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Access denied. Parents cannot create team chats.');
    }

    const campusId = new Types.ObjectId(dto.campus);

    if (!isAdministrator(currentUser)) {
      if (!hasCampusAccess(currentUser as any, campusId)) {
        throw new ForbiddenException('Access denied. You do not have access to this campus.');
      }
    }

    const membersSet = new Set<string>();
    membersSet.add(currentUser._id.toString());

    if (dto.directorAdEl && Array.isArray(dto.directorAdEl)) {
      dto.directorAdEl.forEach((id: string) => {
        membersSet.add(id);
      });
    }

    if (dto.adminAreaManager && Array.isArray(dto.adminAreaManager)) {
      dto.adminAreaManager.forEach((id: string) => {
        membersSet.add(id);
      });
    }

    const membersArray = Array.from(membersSet).map(id => new Types.ObjectId(id));

    const teamChat = new this.teamChatModel({
      title: dto.title,
      campus: campusId,
      members: membersArray,
      status: dto.status || TeamChatStatus.DRAFT,
      decisionStatus: dto.decisionStatus || TeamChatDecisionStatus.OPEN,
      createdBy: currentUser._id,
    });

    const saved = await teamChat.save();

    if (saved.status === TeamChatStatus.PUBLISHED) {
      await this.chatThreadService.create(
        {
          type: ChatThreadType.TEAM,
          refId: saved._id.toString(),
          refModel: 'TeamChat',
          campus: campusId.toString(),
          members: membersArray.map(id => id.toString()),
          status: ChatThreadStatus.PUBLISHED,
          decisionStatus: ChatThreadDecisionStatus.OPEN,
          metadata: {
            title: saved.title,
            campusId: campusId.toString(),
          },
        },
        currentUser,
      );
    }

    const populated = await this.teamChatModel
      .findById(saved._id)
      .populate('members', 'firstName lastName email role')
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    return populated;
  }

  async findAll(query: QueryTeamChatDto, currentUser: User): Promise<PaginatedDto<TeamChatWithUnreadCount>> {
    const { page = 1, limit = 10, campusId, campus, status, search } = query;
    const selectedCampus = campusId || campus;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<TeamChat> = {
      isDeleted: { $ne: true },
    };

    if (selectedCampus) {
      const campusIdObj = new Types.ObjectId(selectedCampus);
      if (!isAdministrator(currentUser)) {
        if (!hasCampusAccess(currentUser as any, campusIdObj)) {
          throw new ForbiddenException('Access denied. You do not have access to this campus.');
        }
      }
      filter.campus = campusIdObj;
    } else if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses || [], 'campus');
      if (campusFilter) {
        Object.assign(filter, campusFilter);
      }
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = TeamChatStatus.PUBLISHED;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const totalItems = await this.teamChatModel.countDocuments(filter).exec();

    let chats = await this.teamChatModel
      .find(filter)
      .populate('members', 'firstName lastName email role')
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    if (!isAdministrator(currentUser)) {
      chats = chats.filter((chat: any) => {
        return chat.members.some((member: any) => member._id.toString() === currentUser._id.toString());
      });
    }

    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat: any) => {
        const threadId = await this.chatThreadService.getThreadIdByTeamChatId(chat._id.toString());
        let unreadCount = 0;
        if (threadId) {
          unreadCount = await this.chatMessageService.getUnreadCountForThread(threadId, currentUser);
        }
        return {
          ...chat,
          unreadCount,
        };
      }),
    );

    return {
      data: chatsWithUnreadCount,
      meta: {
        totalItems: chatsWithUnreadCount.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(chatsWithUnreadCount.length / limit),
      },
    };
  }

  async findMyChats(query: QueryTeamChatDto, currentUser: User): Promise<PaginatedDto<TeamChatWithUnreadCount>> {
    const { page = 1, limit = 1000, campusId, campus } = query;
    const selectedCampus = campusId || campus;

    const filter: FilterQuery<TeamChat> = {
      isDeleted: { $ne: true },
      status: TeamChatStatus.PUBLISHED,
      members: currentUser._id,
    };

    if (selectedCampus) {
      filter.campus = new Types.ObjectId(selectedCampus);
    } else if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses || [], 'campus');
      if (campusFilter) {
        Object.assign(filter, campusFilter);
      }
    }

    const chats = await this.teamChatModel
      .find(filter)
      .populate('members', 'firstName lastName email role')
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat: any) => {
        const threadId = await this.chatThreadService.getThreadIdByTeamChatId(chat._id.toString());
        let unreadCount = 0;
        if (threadId) {
          unreadCount = await this.chatMessageService.getUnreadCountForThread(threadId, currentUser);
        }
        return {
          ...chat,
          unreadCount,
        };
      }),
    );

    return {
      data: chatsWithUnreadCount,
      meta: {
        totalItems: chatsWithUnreadCount.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(chatsWithUnreadCount.length / limit),
      },
    };
  }

  async findById(id: string, currentUser: User): Promise<TeamChat> {
    const chat = await this.teamChatModel
      .findById(id)
      .populate('members', 'firstName lastName email role')
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!chat || chat.isDeleted) {
      throw new NotFoundException('Team chat not found');
    }

    const isMember = chat.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId 
        ? member.toString() 
        : (member._id?.toString() || member.toString());
      return memberId === currentUser._id.toString();
    });

    if (!isMember && !isAdministrator(currentUser)) {
      throw new ForbiddenException('Access denied. You are not a member of this team chat.');
    }

    if (chat.campus && !isAdministrator(currentUser)) {
      // Handle both ObjectId and populated object cases
      const campusId = chat.campus instanceof Types.ObjectId 
        ? chat.campus 
        : (chat.campus as any)?._id || chat.campus;
      
      if (!hasCampusAccess(currentUser as any, campusId)) {
        throw new ForbiddenException('Access denied. You do not have access to this campus.');
      }
    }

    return chat;
  }

  async update(id: string, dto: UpdateTeamChatDto, currentUser: User): Promise<TeamChat> {
    const chat = await this.findById(id, currentUser);

    if (dto.title) {
      chat.title = dto.title;
    }

    if (dto.campus) {
      const campusId = new Types.ObjectId(dto.campus);
      if (!isAdministrator(currentUser)) {
        if (!hasCampusAccess(currentUser as any, campusId)) {
          throw new ForbiddenException('Access denied. You do not have access to this campus.');
        }
      }
      chat.campus = campusId as any;
    }

    if (dto.directorAdEl || dto.adminAreaManager) {
      const membersSet = new Set<string>();
      membersSet.add(currentUser._id.toString());

      if (dto.directorAdEl && Array.isArray(dto.directorAdEl)) {
        dto.directorAdEl.forEach((id: string) => {
          membersSet.add(id);
        });
      }

      if (dto.adminAreaManager && Array.isArray(dto.adminAreaManager)) {
        dto.adminAreaManager.forEach((id: string) => {
          membersSet.add(id);
        });
      }

      chat.members = Array.from(membersSet).map(id => new Types.ObjectId(id)) as any;
    }

    if (dto.decisionStatus) {
      chat.decisionStatus = dto.decisionStatus as TeamChatDecisionStatus;
    }

    if (dto.status) {
      const oldStatus = chat.status;
      chat.status = dto.status as TeamChatStatus;

      if (oldStatus !== TeamChatStatus.PUBLISHED && chat.status === TeamChatStatus.PUBLISHED) {
        const threadId = await this.chatThreadService.getThreadIdByTeamChatId(chat._id.toString());
        if (!threadId) {
          await this.chatThreadService.create(
            {
              type: ChatThreadType.TEAM,
              refId: chat._id.toString(),
              refModel: 'TeamChat',
              campus: chat.campus.toString(),
              members: chat.members.map((id: any) => id.toString()),
              status: ChatThreadStatus.PUBLISHED,
              decisionStatus: ChatThreadDecisionStatus.OPEN,
              metadata: {
                title: chat.title,
                campusId: chat.campus.toString(),
              },
            },
            currentUser,
          );
        }
      }
    }

    chat.updatedBy = currentUser._id as any;
    const updated = await chat.save();

    return this.findById(updated._id.toString(), currentUser);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const chat = await this.findById(id, currentUser);

    chat.isDeleted = true;
    chat.deletedAt = new Date();
    chat.deletedBy = currentUser._id as any;
    await chat.save();
  }

  async getChatThreadId(id: string, currentUser: User): Promise<{ threadId: string }> {
    const chat = await this.findById(id, currentUser);
    if (chat.status !== TeamChatStatus.PUBLISHED) {
      throw new ForbiddenException('Team chat is not published. Cannot get thread ID.');
    }
    const threadId = await this.chatThreadService.getThreadIdByTeamChatId(chat._id.toString());
    if (!threadId) {
      throw new NotFoundException('Chat thread not found for this team chat');
    }
    return { threadId };
  }
}
