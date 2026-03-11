import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { StaffChat, StaffChatStatus } from '../schemas/staff-chat.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { QueryStaffChatDto } from '../dto/query-staff-chat.dto';
import { CreateStaffChatDto } from '../dto/create-staff-chat.dto';
import { UpdateStaffChatDto } from '../dto/update-staff-chat.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { ChatThreadService } from '../../chat/services/chat-thread.service';
import { ChatMessageService } from '../../chat/services/chat-message.service';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../../chat/schemas/chat-thread.schema';
import { isAdministrator, hasCampusAccess, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';
import { buildDateFilter } from 'src/common/utils/chat.util';

type StaffChatWithUnreadCount = any;

@Injectable()
export class StaffChatService {
  constructor(
    @InjectModel(StaffChat.name) private staffChatModel: Model<StaffChat>,
    @InjectModel(User.name) private userModel: Model<User>,
    private chatThreadService: ChatThreadService,
    private chatMessageService: ChatMessageService,
  ) {}

  async create(dto: CreateStaffChatDto, currentUser: User): Promise<StaffChat> {
    if (currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Access denied. Parents cannot create staff chats.');
    }

    const targetUserId = new Types.ObjectId(dto.userId);
    const currentUserId = currentUser._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      throw new ConflictException('Cannot create a chat with yourself.');
    }

    const targetUser = await this.userModel.findById(targetUserId).exec();
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Cannot create staff chat with a parent user.');
    }

    if (targetUser.isDeleted || !targetUser.isActive) {
      throw new NotFoundException('Target user is not active');
    }

    let campusIds: Types.ObjectId[] = [];

    // If campus is provided in DTO, use it (with validation)
    if (dto.campus) {
      const campusId = new Types.ObjectId(dto.campus);
      
      // Validate current user has access to this campus (unless admin)
      if (!isAdministrator(currentUser)) {
        if (!hasCampusAccess(currentUser as any, campusId)) {
          throw new ForbiddenException('Access denied. You do not have access to this campus.');
        }
      }
      
      // Validate target user has access to this campus (unless admin)
      if (!isAdministrator(targetUser)) {
        if (!hasCampusAccess(targetUser as any, campusId)) {
          throw new ForbiddenException('Target user does not have access to the specified campus.');
        }
      }
      
      campusIds = [campusId];
    } else {
      // Auto-detect campus logic
      if (isAdministrator(currentUser)) {
        const targetUserCampuses = (targetUser.campuses || []).map((c: any) => 
          c.toString ? c.toString() : String(c)
        );
        
        if (targetUserCampuses.length > 0) {
          campusIds = targetUserCampuses.map(c => new Types.ObjectId(c));
        }
      } else {
        const currentUserCampuses = (currentUser.campuses || []).map((c: any) => 
          c.toString ? c.toString() : String(c)
        );
        const targetUserCampuses = (targetUser.campuses || []).map((c: any) => 
          c.toString ? c.toString() : String(c)
        );

        if (currentUserCampuses.length === 0 && targetUserCampuses.length === 0) {
          throw new ForbiddenException('Both users must have at least one campus assigned to create a chat.');
        }

        if (currentUserCampuses.length > 0 && targetUserCampuses.length > 0) {
          const commonCampuses = currentUserCampuses.filter(campus => 
            targetUserCampuses.includes(campus)
          );

          if (commonCampuses.length > 0) {
            campusIds = commonCampuses.map(c => new Types.ObjectId(c));
          } else {
            throw new ForbiddenException('Users must be from the same campus to chat.');
          }
        } else if (currentUserCampuses.length === 0) {
          throw new ForbiddenException('Current user must have at least one campus assigned to create a chat.');
        } else if (targetUserCampuses.length === 0) {
          throw new ForbiddenException('Target user must have at least one campus assigned to create a chat.');
        } else {
          campusIds = currentUserCampuses.map(c => new Types.ObjectId(c));
        }
      }
    }

    const currentUserIdStr = currentUserId.toString();
    const targetUserIdStr = targetUserId.toString();
    const sortedUser1Id = currentUserIdStr < targetUserIdStr ? currentUserId : targetUserId;
    const sortedUser2Id = currentUserIdStr < targetUserIdStr ? targetUserId : currentUserId;

    const existingChat = await this.staffChatModel
      .findOne({
        currentUser: sortedUser1Id,
        targetUser: sortedUser2Id,
        isDeleted: { $ne: true },
      })
      .exec();

    if (existingChat) {
      const populated = await this.staffChatModel
        .findById(existingChat._id)
        .populate('currentUser', 'firstName lastName email role')
        .populate('targetUser', 'firstName lastName email role')
        .populate('campus', 'name')
        .populate('createdBy', 'firstName lastName')
        .exec();
      return populated;
    }

    const staffChat = new this.staffChatModel({
      currentUser: sortedUser1Id,
      targetUser: sortedUser2Id,
      campus: campusIds,
      status: dto.status || StaffChatStatus.OPEN,
      createdBy: currentUserId,
    });

    const saved = await staffChat.save();

    const thread = await this.chatThreadService.create(
      {
        type: ChatThreadType.STAFF,
        refId: saved._id.toString(),
        refModel: 'StaffChat',
        campus: campusIds.length > 0 ? campusIds[0].toString() : undefined,
        members: [sortedUser1Id.toString(), sortedUser2Id.toString()],
        status: ChatThreadStatus.PUBLISHED,
        decisionStatus: ChatThreadDecisionStatus.OPEN,
        metadata: {
          currentUserId: sortedUser1Id.toString(),
          targetUserId: sortedUser2Id.toString(),
          campusIds: campusIds.map(c => c.toString()),
        },
      },
      currentUser,
    );

    const populated = await this.staffChatModel
      .findById(saved._id)
      .populate('currentUser', 'firstName lastName email role')
      .populate('targetUser', 'firstName lastName email role')
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    return populated;
  }

  async findAll(query: QueryStaffChatDto, currentUser: User): Promise<PaginatedDto<StaffChatWithUnreadCount>> {
    const { page = 1, limit = 10, campusId, campus, status, search } = query;
    const selectedCampus = campusId || campus;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<StaffChat> = {
      isDeleted: { $ne: true },
      $or: [
        { currentUser: currentUser._id },
        { targetUser: currentUser._id },
      ],
    };

    if (selectedCampus) {
      const campusIdObj = new Types.ObjectId(selectedCampus);
      if (!isAdministrator(currentUser)) {
        if (!hasCampusAccess(currentUser as any, campusIdObj)) {
          throw new ForbiddenException('Access denied. You do not have access to this campus.');
        }
      }
      filter.campus = { $in: [campusIdObj] };
    } else if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses || [], 'campus');
      if (campusFilter) {
        Object.assign(filter, campusFilter);
      }
    }

    if (status) {
      filter.status = status;
    }

    const totalItems = await this.staffChatModel.countDocuments(filter).exec();

    let chats = await this.staffChatModel
      .find(filter)
      .populate('currentUser', 'firstName lastName email role')
      .populate('targetUser', 'firstName lastName email role')
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    if (search) {
      const searchLower = search.toLowerCase();
      chats = chats.filter((chat: any) => {
        const currentUserName = `${chat.currentUser?.firstName || ''} ${chat.currentUser?.lastName || ''}`.toLowerCase();
        const targetUserName = `${chat.targetUser?.firstName || ''} ${chat.targetUser?.lastName || ''}`.toLowerCase();
        return currentUserName.includes(searchLower) || targetUserName.includes(searchLower);
      });
    }

    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat: any) => {
        const threadId = await this.chatThreadService.getThreadIdByStaffChatId(chat._id.toString());
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
        totalItems,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findMyChats(query: QueryStaffChatDto, currentUser: User): Promise<PaginatedDto<StaffChatWithUnreadCount>> {
    const { page = 1, limit = 1000, campusId, campus } = query;
    const selectedCampus = campusId || campus;

    const filter: FilterQuery<StaffChat> = {
      isDeleted: { $ne: true },
      status: StaffChatStatus.OPEN,
      $or: [
        { currentUser: currentUser._id },
        { targetUser: currentUser._id },
      ],
    };

    if (selectedCampus) {
      filter.campus = { $in: [new Types.ObjectId(selectedCampus)] };
    } else if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses || [], 'campus');
      if (campusFilter) {
        Object.assign(filter, campusFilter);
      }
    }

    const allChats = await this.staffChatModel
      .find(filter)
      .populate('currentUser', 'firstName lastName email role')
      .populate('targetUser', 'firstName lastName email role')
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean()
      .exec();

    const currentUserId = currentUser._id.toString();

    const roleOrder: Record<UserRole, number> = {
      [UserRole.ADMINISTRATOR]: 1,
      [UserRole.AREA_MANAGER]: 2,
      [UserRole.DIRECTOR]: 3,
      [UserRole.ASSISTANT_DIRECTOR]: 4,
      [UserRole.EDUCATIONAL_LEADER]: 5,
      [UserRole.ENROLMENTS]: 6,
      [UserRole.WHS_MEDICAL]: 7,
      [UserRole.CENTRE_LOGIN]: 8,
      [UserRole.ROOM_LOGIN]: 9,
      [UserRole.STAFF]: 10,
      [UserRole.TEACHER]: 11,
      [UserRole.PARENT]: 12,
    };

    allChats.sort((a: any, b: any) => {
      const currentUserIdA = a.currentUser?._id?.toString() || a.currentUser?.toString();
      const targetUserIdA = a.targetUser?._id?.toString() || a.targetUser?.toString();
      const otherUserA = currentUserIdA === currentUserId ? a.targetUser : a.currentUser;
      const otherUserRoleA = otherUserA?.role || '';

      const currentUserIdB = b.currentUser?._id?.toString() || b.currentUser?.toString();
      const targetUserIdB = b.targetUser?._id?.toString() || b.targetUser?.toString();
      const otherUserB = currentUserIdB === currentUserId ? b.targetUser : b.currentUser;
      const otherUserRoleB = otherUserB?.role || '';

      const orderA = roleOrder[otherUserRoleA as UserRole] || Infinity;
      const orderB = roleOrder[otherUserRoleB as UserRole] || Infinity;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const chatsWithUnreadCount = await Promise.all(
      allChats.map(async (chat: any) => {
        const threadId = await this.chatThreadService.getThreadIdByStaffChatId(chat._id.toString());
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

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(1000, limit));
    const skip = (pageNum - 1) * limitNum;
    const paginatedChats = chatsWithUnreadCount.slice(skip, skip + limitNum);

    return {
      data: paginatedChats,
      meta: {
        totalItems: chatsWithUnreadCount.length,
        itemsPerPage: limitNum,
        currentPage: pageNum,
        totalPages: Math.ceil(chatsWithUnreadCount.length / limitNum),
      },
    };
  }

  async findById(id: string, currentUser: User): Promise<StaffChat> {
    const chat = await this.staffChatModel
      .findById(id)
      .populate('currentUser', 'firstName lastName email role')
      .populate('targetUser', 'firstName lastName email role')
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!chat || chat.isDeleted) {
      throw new NotFoundException('Staff chat not found');
    }

    // Handle both ObjectId and populated object cases
    const currentUserIdInChat = chat.currentUser instanceof Types.ObjectId 
      ? chat.currentUser.toString() 
      : (chat.currentUser as any)?._id?.toString() || chat.currentUser?.toString();
    const targetUserIdInChat = chat.targetUser instanceof Types.ObjectId 
      ? chat.targetUser.toString() 
      : (chat.targetUser as any)?._id?.toString() || chat.targetUser?.toString();
    const currentUserId = currentUser._id.toString();

    const isMember = currentUserIdInChat === currentUserId || targetUserIdInChat === currentUserId;

    if (!isMember && !isAdministrator(currentUser)) {
      throw new ForbiddenException('Access denied. You are not a member of this chat.');
    }

    if (chat.campus && Array.isArray(chat.campus) && chat.campus.length > 0 && !isAdministrator(currentUser)) {
      const userCampusIds = (currentUser.campuses || []).map((c: any) => {
        if (c instanceof Types.ObjectId) return c.toString();
        if (c?._id) return c._id.toString();
        return c?.toString() || String(c);
      });
      
      const chatCampusIds = chat.campus.map((c: any) => {
        if (c instanceof Types.ObjectId) return c.toString();
        if (c?._id) return c._id.toString();
        return c?.toString() || String(c);
      });
      
      const hasCommonCampus = chatCampusIds.some(campusId => userCampusIds.includes(campusId));
      
      if (!hasCommonCampus) {
        throw new ForbiddenException('Access denied. You do not have access to this campus.');
      }
    }

    return chat;
  }

  async update(id: string, dto: UpdateStaffChatDto, currentUser: User): Promise<StaffChat> {
    const chat = await this.findById(id, currentUser);

    if (dto.status) {
      chat.status = dto.status as StaffChatStatus;
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
    const threadId = await this.chatThreadService.getThreadIdByStaffChatId(chat._id.toString());
    if (!threadId) {
      throw new NotFoundException('Chat thread not found for this staff chat');
    }
    return { threadId };
  }
}
