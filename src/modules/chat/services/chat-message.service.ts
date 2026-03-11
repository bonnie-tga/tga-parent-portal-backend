import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage } from '../schemas/chat-message.schema';
import { ChatThread } from '../schemas/chat-thread.schema';
import { User } from '../../users/schemas/user.schema';
import { ParentChat } from '../../parent-chat/schemas/parent-chat.schema';
import { AccountChat } from '../../account-chat/schemas/account-chat.schema';
import { ManagementChat } from '../../management-chat/schemas/management-chat.schema';
import { CreateChatMessageDto } from '../dto/create-chat-message.dto';
import { QueryChatMessageDto } from '../dto/query-chat-message.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { checkChatThreadAccess, checkChatStatusForParent } from '../utils/chat-access.util';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
    @InjectModel(ChatThread.name) private chatThreadModel: Model<ChatThread>,
    @InjectModel(ParentChat.name) private parentChatModel: Model<ParentChat>,
    @InjectModel(AccountChat.name) private accountChatModel: Model<AccountChat>,
    @InjectModel(ManagementChat.name) private managementChatModel: Model<ManagementChat>,
  ) {}

  async create(dto: CreateChatMessageDto, currentUser: User): Promise<ChatMessage> {
    const thread = await this.chatThreadModel.findById(dto.threadId).exec();
    if (!thread || thread.isDeleted) {
      throw new NotFoundException('Chat thread not found');
    }

    checkChatThreadAccess(thread, currentUser);
    await checkChatStatusForParent(thread, currentUser, this.parentChatModel, this.accountChatModel, this.managementChatModel);

    // Validate: Either message or attachments must be provided
    if ((!dto.message || dto.message.trim().length === 0) && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException('Either message or attachments must be provided');
    }

    const message = new this.chatMessageModel({
      threadId: new Types.ObjectId(dto.threadId),
      senderId: currentUser._id,
      senderRole: currentUser.role,
      message: dto.message?.trim() || '',
      attachments: dto.attachments || [],
      readBy: [currentUser._id],
    });

    await message.save();

    const populated = await this.chatMessageModel
      .findById(message._id)
      .populate('senderId', 'firstName lastName email')
      .exec();

    const chatType = this.mapThreadTypeToChatType(thread.type);
    const messageObj = populated.toObject();
    return { ...messageObj, chatType } as any;
  }

  async findAll(query: QueryChatMessageDto, currentUser: User): Promise<PaginatedDto<any>> {
    const { threadId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const thread = await this.chatThreadModel.findById(threadId).exec();
    if (!thread || thread.isDeleted) {
      throw new NotFoundException('Chat thread not found');
    }

    checkChatThreadAccess(thread, currentUser);
    await checkChatStatusForParent(thread, currentUser, this.parentChatModel, this.accountChatModel, this.managementChatModel);

    await this.markThreadMessagesAsRead(threadId, currentUser);

    const chatType = this.mapThreadTypeToChatType(thread.type);

    const [data, totalCount] = await Promise.all([
      this.chatMessageModel
        .find({ threadId: new Types.ObjectId(threadId) })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('senderId', 'firstName lastName email')
        .exec(),
      this.chatMessageModel.countDocuments({ threadId: new Types.ObjectId(threadId) }),
    ]);

    const messagesWithChatType = data.map((msg) => {
      const msgObj = msg.toObject();
      return { ...msgObj, chatType };
    });

    return {
      data: messagesWithChatType.reverse(),
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async markThreadMessagesAsRead(threadId: string, currentUser: User): Promise<void> {
    await this.chatMessageModel.updateMany(
      {
        threadId: new Types.ObjectId(threadId),
        readBy: { $ne: currentUser._id },
      },
      {
        $addToSet: { readBy: currentUser._id },
      },
    );
  }

  async getUnreadCountForThread(threadId: string, currentUser: User): Promise<number> {
    const userId = currentUser._id instanceof Types.ObjectId 
      ? currentUser._id 
      : new Types.ObjectId(currentUser._id.toString());

    // Count messages where:
    // 1. Thread matches
    // 2. Not sent by current user
    // 3. Current user's ID is NOT in readBy array
    // Using $not with $elemMatch to check if userId is NOT in readBy array
    // This works correctly for: empty arrays, non-existent field, and arrays without userId
    const unreadCount = await this.chatMessageModel.countDocuments({
      threadId: new Types.ObjectId(threadId),
      senderId: { $ne: userId },
      $or: [
        { readBy: { $exists: false } }, // Field doesn't exist - message is unread
        {
          readBy: {
            $not: {
              $elemMatch: { $eq: userId }
            }
          }
        }, // userId is NOT in readBy array (works for empty arrays too)
      ],
    });

    return unreadCount;
  }

  async getUnreadCountForThreads(threadIds: string[], currentUser: User): Promise<Map<string, number>> {
    if (threadIds.length === 0) {
      return new Map();
    }

    const objectIds = threadIds.map(id => new Types.ObjectId(id));
    const userId = currentUser._id instanceof Types.ObjectId ? currentUser._id : new Types.ObjectId(currentUser._id.toString());

    const results = await this.chatMessageModel.aggregate([
      {
        $match: {
          threadId: { $in: objectIds },
          senderId: { $ne: userId },
          readBy: { $nin: [userId] },
        },
      },
      {
        $group: {
          _id: '$threadId',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const unreadCountMap = new Map<string, number>();
    threadIds.forEach(threadId => {
      unreadCountMap.set(threadId, 0);
    });

    results.forEach((result: any) => {
      unreadCountMap.set(result._id.toString(), result.count);
    });

    return unreadCountMap;
  }

  async getTotalUnreadCount(currentUser: User): Promise<number> {
    const threads = await this.chatThreadModel
      .find({
        members: currentUser._id,
        isDeleted: { $ne: true },
      })
      .select('_id')
      .lean()
      .exec();

    if (threads.length === 0) {
      return 0;
    }

    const threadIds = threads.map(t => t._id);
    const userId = currentUser._id instanceof Types.ObjectId ? currentUser._id : new Types.ObjectId(currentUser._id.toString());

    const totalUnread = await this.chatMessageModel.countDocuments({
      threadId: { $in: threadIds },
      senderId: { $ne: userId },
      readBy: { $nin: [userId] },
    });

    return totalUnread;
  }

  async markAsRead(messageId: string, currentUser: User): Promise<ChatMessage> {
    const message = await this.chatMessageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const thread = await this.chatThreadModel.findById(message.threadId).exec();
    if (!thread || thread.isDeleted) {
      throw new NotFoundException('Chat thread not found');
    }

    checkChatThreadAccess(thread, currentUser);

    const readByIds = message.readBy.map((id) => id.toString());
    const userId = currentUser._id.toString();

    if (!readByIds.includes(userId)) {
      const userIdObj = new Types.ObjectId(userId);
      message.readBy.push(userIdObj as any);
      await message.save();
    }

    const populated = await this.chatMessageModel
      .findById(messageId)
      .populate('senderId', 'firstName lastName email')
      .exec();

    const chatType = this.mapThreadTypeToChatType(thread.type);
    const messageObj = populated.toObject();
    return { ...messageObj, chatType } as any;
  }

  async clearThreadMessages(threadId: string, currentUser: User): Promise<{ success: boolean; deletedCount: number }> {
    const thread = await this.chatThreadModel.findById(threadId).exec();
    if (!thread || thread.isDeleted) {
      throw new NotFoundException('Chat thread not found');
    }

    checkChatThreadAccess(thread, currentUser);

    const result = await this.chatMessageModel.deleteMany({
      threadId: new Types.ObjectId(threadId),
    }).exec();

    return {
      success: true,
      deletedCount: result.deletedCount || 0,
    };
  }

  private mapThreadTypeToChatType(threadType: string): 'parent-chat' | 'account-chat' | 'management-chat' | 'team-chat' | 'staff-chat' {
    const typeMap: Record<string, 'parent-chat' | 'account-chat' | 'management-chat' | 'team-chat' | 'staff-chat'> = {
      PARENT: 'parent-chat',
      ACCOUNT: 'account-chat',
      MANAGEMENT: 'management-chat',
      TEAM: 'team-chat',
      STAFF: 'staff-chat',
    };
    return typeMap[threadType] || 'parent-chat';
  }
}
