import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { ParentChatService } from '../../parent-chat/services/parent-chat.service';
import { AccountChatService } from '../../account-chat/services/account-chat.service';
import { ManagementChatService } from '../../management-chat/services/management-chat.service';
import { StaffChatService } from '../../staff-chat/services/staff-chat.service';
import { TeamChatService } from '../../team-chat/services/team-chat.service';
import { ChatMessageService } from './chat-message.service';
import { ChatThread } from '../schemas/chat-thread.schema';
import { QueryMyChatsDto } from '../dto/query-my-chats.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { QueryParentChatDto } from '../../parent-chat/dto/query-parent-chat.dto';
import { QueryAccountChatDto } from '../../account-chat/dto/query-account-chat.dto';
import { QueryManagementChatDto } from '../../management-chat/dto/query-management-chat.dto';
import { QueryStaffChatDto } from '../../staff-chat/dto/query-staff-chat.dto';
import { QueryTeamChatDto } from '../../team-chat/dto/query-team-chat.dto';

type ChatWithType = any & { chatType: 'parent-chat' | 'account-chat' | 'management-chat' | 'staff-chat' | 'team-chat' };

@Injectable()
export class MyChatsService {
  constructor(
    @InjectModel(ChatThread.name) private chatThreadModel: Model<ChatThread>,
    private readonly parentChatService: ParentChatService,
    private readonly accountChatService: AccountChatService,
    private readonly managementChatService: ManagementChatService,
    private readonly staffChatService: StaffChatService,
    private readonly teamChatService: TeamChatService,
    private readonly chatMessageService: ChatMessageService,
  ) {}

  async findMyChats(query: QueryMyChatsDto, currentUser: User): Promise<PaginatedDto<ChatWithType>> {
    const { page = 1, limit = 10 } = query;

    const parentChatQuery: QueryParentChatDto = {
      ...query,
      page: 1,
      limit: 1000,
    };

    const accountChatQuery: QueryAccountChatDto = {
      ...query,
      page: 1,
      limit: 1000,
    };

    const managementChatQuery: QueryManagementChatDto = {
      ...query,
      page: 1,
      limit: 1000,
    };

    const staffChatQuery: QueryStaffChatDto = {
      ...query,
      page: 1,
      limit: 1000,
    };

    const teamChatQuery: QueryTeamChatDto = {
      ...query,
      page: 1,
      limit: 1000,
    };

    const [parentChatsResult, accountChatsResult, managementChatsResult, staffChatsResult, teamChatsResult] = await Promise.all([
      this.parentChatService.findMyChats(parentChatQuery, currentUser),
      this.accountChatService.findMyChats(accountChatQuery, currentUser),
      this.managementChatService.findMyChats(managementChatQuery, currentUser),
      this.staffChatService.findMyChats(staffChatQuery, currentUser),
      this.teamChatService.findMyChats(teamChatQuery, currentUser),
    ]);

    const allChats: ChatWithType[] = [
      ...parentChatsResult.data.map((chat: any) => ({
        ...chat,
        chatType: 'parent-chat' as const,
      })),
      ...accountChatsResult.data.map((chat: any) => ({
        ...chat,
        chatType: 'account-chat' as const,
      })),
      ...managementChatsResult.data.map((chat: any) => ({
        ...chat,
        chatType: 'management-chat' as const,
      })),
      ...staffChatsResult.data.map((chat: any) => ({
        ...chat,
        chatType: 'staff-chat' as const,
      })),
      ...teamChatsResult.data.map((chat: any) => ({
        ...chat,
        chatType: 'team-chat' as const,
      })),
    ];

    allChats.sort((a, b) => {
      // First sort by chatType: parent-chat first, then account-chat, then management-chat, then staff-chat, then team-chat
      if (a.chatType !== b.chatType) {
        const order = ['parent-chat', 'account-chat', 'management-chat', 'staff-chat', 'team-chat'];
        const indexA = order.indexOf(a.chatType);
        const indexB = order.indexOf(b.chatType);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      }
      // Within same type, sort by date (newest first)
      const dateA = new Date(a.createdAt || a.publishAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.publishAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    const skip = (page - 1) * limit;
    const paginatedChats = allChats.slice(skip, skip + limit);

    let filteredChats = paginatedChats;
    if (query.messages === 'new') {
      filteredChats = paginatedChats.filter((chat) => chat.unreadCount > 0);
    }

    const totalItems = query.messages === 'new' 
      ? allChats.filter((chat) => chat.unreadCount > 0).length
      : allChats.length;

    const totalUnreadCount = allChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

    return {
      data: filteredChats,
      meta: {
        totalItems,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalUnreadCount,
      },
    };
  }

  async getTotalUnreadCount(currentUser: User): Promise<{
    totalUnreadCount: number;
    unreadCountsByChatType: {
      'parent-chat': number;
      'account-chat': number;
      'management-chat': number;
      'staff-chat': number;
      'team-chat': number;
    };
  }> {
    const threads = await this.chatThreadModel
      .find({
        members: currentUser._id,
        isDeleted: { $ne: true },
      })
      .select('_id type refId')
      .lean()
      .exec();

    if (threads.length === 0) {
      return {
        totalUnreadCount: 0,
        unreadCountsByChatType: {
          'parent-chat': 0,
          'account-chat': 0,
          'management-chat': 0,
          'staff-chat': 0,
          'team-chat': 0,
        },
      };
    }

    const threadIds = threads.map(t => t._id.toString());
    const unreadCountMap = await this.chatMessageService.getUnreadCountForThreads(threadIds, currentUser);

    const typeToChatTypeMap: Record<string, 'parent-chat' | 'account-chat' | 'management-chat' | 'staff-chat' | 'team-chat'> = {
      PARENT: 'parent-chat',
      ACCOUNT: 'account-chat',
      MANAGEMENT: 'management-chat',
      STAFF: 'staff-chat',
      TEAM: 'team-chat',
    };

    const unreadCountsByChatType = {
      'parent-chat': 0,
      'account-chat': 0,
      'management-chat': 0,
      'staff-chat': 0,
      'team-chat': 0,
    };

    threads.forEach(thread => {
      const chatType = typeToChatTypeMap[thread.type] || 'parent-chat';
      const unreadCount = unreadCountMap.get(thread._id.toString()) || 0;
      unreadCountsByChatType[chatType] += unreadCount;
    });

    const totalUnreadCount = Array.from(unreadCountMap.values()).reduce((sum, count) => sum + count, 0);

    return {
      totalUnreadCount,
      unreadCountsByChatType,
    };
  }
}
