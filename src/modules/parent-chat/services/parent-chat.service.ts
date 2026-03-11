import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { ParentChat, ParentChatStatus, ParentChatDecisionStatus } from '../schemas/parent-chat.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';
import { QueryParentChatDto } from '../dto/query-parent-chat.dto';
import { CreateParentChatDto } from '../dto/create-parent-chat.dto';
import { UpdateParentChatDto } from '../dto/update-parent-chat.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { buildCampusFilter, isAdministrator, hasCampusAccess, hasRoomAccess } from 'src/common/access/access-filter.util';
import { buildDateFilter } from 'src/common/utils/chat.util';
import { ChatThreadService } from '../../chat/services/chat-thread.service';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../../chat/schemas/chat-thread.schema';
import { ChatMessageService } from '../../chat/services/chat-message.service';
import { objectIdInArray } from 'src/utils/mongoose-helper';

type ParentChatWithUnreadCount = any;

@Injectable()
export class ParentChatService {
  constructor(
    @InjectModel(ParentChat.name) private parentChatModel: Model<ParentChat>,
    @InjectModel(Child.name) private childModel: Model<Child>,
    @InjectModel(User.name) private userModel: Model<User>,
    private chatThreadService: ChatThreadService,
    private chatMessageService: ChatMessageService,
  ) {}

  async findAll(query: QueryParentChatDto, currentUser: User): Promise<PaginatedDto<ParentChatWithUnreadCount>> {
    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<ParentChat> = {
      isDeleted: { $ne: true },
    };

    if (search) {
      const searchConditions: FilterQuery<ParentChat>[] = [];

      const matchingChildren = await this.childModel
        .find({
          fullName: { $regex: search, $options: 'i' },
        })
        .select('_id')
        .lean()
        .exec();

      const matchingParents = await this.userModel
        .find({
          role: UserRole.PARENT,
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      if (matchingChildren.length > 0) {
        const childIds = matchingChildren.map((c) => c._id);
        searchConditions.push({ children: { $in: childIds } });
      }

      if (matchingParents.length > 0) {
        const parentIds = matchingParents.map((p) => p._id);
        searchConditions.push({ members: { $in: parentIds } });
      }

      if (searchConditions.length > 0) {
        filter.$or = searchConditions;
      } else {
        filter._id = { $in: [] };
      }
    }

    if (campus) {
      filter.campus = Types.ObjectId.isValid(campus) ? new Types.ObjectId(campus) : campus;
    }
    if (room) {
      filter.room = Types.ObjectId.isValid(room) ? new Types.ObjectId(room) : room;
    }
    if (decisionStatus) filter.decisionStatus = decisionStatus;

    const dateFilter = buildDateFilter(month, year, dates);
    if (Object.keys(dateFilter).length > 0) {
      filter = { ...filter, ...dateFilter };
    }

    if (currentUser.role === UserRole.WHS_MEDICAL) {
      filter._id = { $in: [] };
    } else if (currentUser.role !== UserRole.ADMINISTRATOR) {
      const campusFilter = buildCampusFilter(currentUser as any);
      if (Object.keys(campusFilter).length > 0) {
        filter.campus = { $in: currentUser.campuses?.map(c => new Types.ObjectId(c.toString())) || [] };
      }
      if (currentUser.accessScope === 'single_room') {
        filter.room = { $in: currentUser.rooms?.map(r => new Types.ObjectId(r.toString())) || [] };
      }
    }

    if (currentUser.role === UserRole.PARENT) {
      const childrenInRooms = await this.childModel
        .find({ parents: currentUser._id, isActive: true })
        .select('room')
        .lean()
        .exec();
      
      const roomIds = [...new Set(childrenInRooms.map(c => c.room.toString()))];
      if (roomIds.length > 0) {
        filter.room = { $in: roomIds.map(id => new Types.ObjectId(id)) };
      } else {
        filter._id = { $in: [] };
      }
    }

    const [data, totalCount] = await Promise.all([
      this.parentChatModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.parentChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.chatThreadService.getThreadIdByParentChatId(chat._id.toString());
        let unreadCount = 0;
        if (threadId) {
          unreadCount = await this.chatMessageService.getUnreadCountForThread(threadId, currentUser);
        }
        return {
          ...chat.toObject(),
          unreadCount,
        };
      }),
    );

    let filteredData = dataWithUnreadCount;
    if (messages === 'new') {
      filteredData = dataWithUnreadCount.filter((chat) => chat.unreadCount > 0);
    }

    return {
      data: filteredData,
      meta: {
        totalItems: messages === 'new' ? filteredData.length : totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil((messages === 'new' ? filteredData.length : totalCount) / limit),
      },
    };
  }

  async findMyChats(query: QueryParentChatDto, currentUser: User): Promise<PaginatedDto<ParentChatWithUnreadCount>> {
    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<ParentChat> = {
      members: currentUser._id,
      isDeleted: { $ne: true },
      status: ParentChatStatus.PUBLISHED,
    };

    if (search) {
      const searchConditions: FilterQuery<ParentChat>[] = [];

      const matchingChildren = await this.childModel
        .find({
          fullName: { $regex: search, $options: 'i' },
        })
        .select('_id')
        .lean()
        .exec();

      const matchingParents = await this.userModel
        .find({
          role: UserRole.PARENT,
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      if (matchingChildren.length > 0) {
        const childIds = matchingChildren.map((c) => c._id);
        searchConditions.push({ children: { $in: childIds } });
      }

      if (matchingParents.length > 0) {
        const parentIds = matchingParents.map((p) => p._id);
        searchConditions.push({ members: { $in: parentIds } });
      }

      if (searchConditions.length > 0) {
        filter.$and = [
          { $or: searchConditions },
        ];
      } else {
        filter._id = { $in: [] };
      }
    }

    if (campus) {
      filter.campus = Types.ObjectId.isValid(campus) ? new Types.ObjectId(campus) : campus;
    }
    if (room) {
      filter.room = Types.ObjectId.isValid(room) ? new Types.ObjectId(room) : room;
    }
    if (decisionStatus) filter.decisionStatus = decisionStatus;

    const dateFilter = buildDateFilter(month, year, dates);
    if (Object.keys(dateFilter).length > 0) {
      filter = { ...filter, ...dateFilter };
    }

    filter.status = ParentChatStatus.PUBLISHED;

    const [data, totalCount] = await Promise.all([
      this.parentChatModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('children', 'fullName')
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.parentChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.chatThreadService.getThreadIdByParentChatId(chat._id.toString());
        let unreadCount = 0;
        if (threadId) {
          unreadCount = await this.chatMessageService.getUnreadCountForThread(threadId, currentUser);
        }
        return {
          ...chat.toObject(),
          unreadCount,
        };
      }),
    );

    let filteredData = dataWithUnreadCount;
    if (messages === 'new') {
      filteredData = dataWithUnreadCount.filter((chat) => chat.unreadCount > 0);
    }

    return {
      data: filteredData,
      meta: {
        totalItems: messages === 'new' ? filteredData.length : totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil((messages === 'new' ? filteredData.length : totalCount) / limit),
      },
    };
  }


  async findById(id: string, currentUser: User): Promise<ParentChat> {
    const parentChat = await this.parentChatModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('members', 'firstName lastName email')
      .exec();
    
    if (!parentChat) {
      throw new NotFoundException('Parent chat not found');
    }

    if (currentUser.role === UserRole.WHS_MEDICAL) {
      throw new ForbiddenException('Access denied');
    }

    // Check if user is a member in this chat
    // parentChat.members can be populated (array of User objects) or unpopulated (array of ObjectIds)
    const isMember = objectIdInArray(currentUser._id, parentChat.members as any);

    if (isMember) {
      return parentChat;
    }

    // If user is PARENT role but not in members array, deny access
    if (currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Access denied');
    }

    // Administrator has full access
    if (isAdministrator(currentUser)) {
      return parentChat;
    }

    // Roles that need campus access: Area Manager, Director, Assistant Director, Educational Leader, Centre Login
    const campusAccessRoles = [
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
      UserRole.CENTRE_LOGIN,
    ];

    if (campusAccessRoles.includes(currentUser.role)) {
      if (hasCampusAccess(currentUser as any, parentChat.campus)) {
        return parentChat;
      }
      throw new ForbiddenException('Access denied');
    }

    // Roles that need room access: Room Login, Staff
    const roomAccessRoles = [UserRole.ROOM_LOGIN, UserRole.STAFF];

    if (roomAccessRoles.includes(currentUser.role)) {
      if (hasRoomAccess(currentUser as any, parentChat.room)) {
        return parentChat;
      }
      throw new ForbiddenException('Access denied');
    }

    // No access for other roles
    throw new ForbiddenException('Access denied');
  }

  async create(dto: CreateParentChatDto, currentUser: User): Promise<ParentChat> {
    if (!dto.children) {
      throw new NotFoundException('Child ID is required');
    }

    if (!dto.room) {
      throw new NotFoundException('Room ID is required');
    }

    const child = await this.childModel.findById(dto.children);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const room = new Types.ObjectId(dto.room);
    const campus = dto.campus ? new Types.ObjectId(dto.campus) : child.campus;
    const childId = new Types.ObjectId(dto.children);

    const existingChat = await this.parentChatModel
      .findOne({
        campus,
        room,
        isDeleted: { $ne: true },
      })
      .exec();

    if (existingChat) {
      throw new ConflictException('A chat room already exists for this room. Please use the existing chat.');
    }

    const allChildrenInRoom = await this.childModel
      .find({ room, campus, isActive: true })
      .select('_id parents')
      .lean()
      .exec();

    const allParentIds = new Set<Types.ObjectId>();

    allChildrenInRoom.forEach(roomChild => {
      if (roomChild.parents && Array.isArray(roomChild.parents)) {
        roomChild.parents.forEach((parentId: any) => {
          allParentIds.add(new Types.ObjectId(parentId.toString()));
        });
      }
    });

    if (dto.members && Array.isArray(dto.members)) {
      dto.members.forEach((id: string) => {
        allParentIds.add(new Types.ObjectId(id));
      });
    }

    const roomUsers = await this.userModel
      .find({
        rooms: { $in: [room] },
        role: { $ne: UserRole.WHS_MEDICAL },
        isDeleted: { $ne: true },
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    roomUsers.forEach((user: any) => {
      allParentIds.add(new Types.ObjectId(user._id.toString()));
    });

    const allChildrenIds: Types.ObjectId[] = allChildrenInRoom.map(c => 
      new Types.ObjectId(c._id.toString())
    );
    
    const selectedChildIndex = allChildrenIds.findIndex(
      id => id.toString() === childId.toString()
    );

    const childrenArray: Types.ObjectId[] = 
      selectedChildIndex > 0
        ? [
            childId,
            ...allChildrenIds.filter(id => id.toString() !== childId.toString())
          ]
        : selectedChildIndex === -1
        ? [childId, ...allChildrenIds]
        : allChildrenIds;

    const finalStatus = dto.status || ParentChatStatus.PUBLISHED;
    const publishAt = finalStatus === ParentChatStatus.PUBLISHED ? new Date() : null;

    const parentChat = new this.parentChatModel({
      campus,
      room,
      children: childrenArray,
      members: Array.from(allParentIds),
      status: finalStatus,
      decisionStatus: dto.decisionStatus || ParentChatDecisionStatus.OPEN,
      newMessage: 0,
      publishAt,
      createdBy: currentUser._id,
    });

    await parentChat.save();

    try {
      const chatThreadStatus = dto.status === ParentChatStatus.DRAFT 
        ? ChatThreadStatus.DRAFT 
        : ChatThreadStatus.PUBLISHED;
      const chatThreadDecisionStatus = dto.decisionStatus === ParentChatDecisionStatus.CLOSE
        ? ChatThreadDecisionStatus.CLOSE
        : ChatThreadDecisionStatus.OPEN;

      await this.chatThreadService.create(
        {
          type: ChatThreadType.PARENT,
          refId: parentChat._id.toString(),
          refModel: 'ParentChat',
          campus: campus.toString(),
          room: room.toString(),
          members: Array.from(allParentIds).map((id) => id.toString()),
          status: chatThreadStatus,
          decisionStatus: chatThreadDecisionStatus,
          metadata: {
            childrenIds: childrenArray.map((id) => id.toString()),
          },
        },
        currentUser,
      );
    } catch (error) {
    }

    const populated = await this.parentChatModel
      .findById(parentChat._id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('members', 'firstName lastName email')
      .exec();

    return populated;
  }

  async update(id: string, dto: UpdateParentChatDto, currentUser: User): Promise<ParentChat> {
    const parentChat = await this.parentChatModel.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!parentChat) {
      throw new NotFoundException('Parent chat not found');
    }

    if (currentUser.role === UserRole.WHS_MEDICAL) {
      throw new ForbiddenException('Access denied');
    }

    // Check access
    const hasAccess = 
      parentChat.members.some((p) => {
        const memberId = p instanceof Types.ObjectId ? p : (p as { _id?: Types.ObjectId; toString?: () => string });
        return memberId.toString() === currentUser._id.toString();
      }) ||
      currentUser.role === UserRole.ADMINISTRATOR ||
      currentUser.role === UserRole.AREA_MANAGER ||
      currentUser.role === UserRole.DIRECTOR ||
      currentUser.role === UserRole.ASSISTANT_DIRECTOR ||
      currentUser.role === UserRole.EDUCATIONAL_LEADER ||
      currentUser.role === UserRole.CENTRE_LOGIN ||
      currentUser.role === UserRole.ROOM_LOGIN ||
      currentUser.role === UserRole.STAFF;

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      updatedBy: currentUser._id,
    };

    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === ParentChatStatus.PUBLISHED) {
        updateData.publishAt = parentChat.publishAt || new Date();
      } else if (dto.status === ParentChatStatus.DRAFT) {
        updateData.publishAt = null;
      }
    }
    if (dto.decisionStatus !== undefined) {
      updateData.decisionStatus = dto.decisionStatus;
    }
    if (dto.members !== undefined) {
      updateData.members = dto.members.map((id: string) => new Types.ObjectId(id));
    }

    await this.parentChatModel.findByIdAndUpdate(id, updateData);

    const updated = await this.parentChatModel
      .findById(id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('children', 'fullName')
      .populate('members', 'firstName lastName email')
      .exec();

    return updated;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const parentChat = await this.parentChatModel.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!parentChat) {
      throw new NotFoundException('Parent chat not found');
    }

    if (currentUser.role !== UserRole.ADMINISTRATOR && currentUser.role !== UserRole.AREA_MANAGER) {
      throw new ForbiddenException('Access denied');
    }

    await this.parentChatModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: currentUser._id,
    });
  }

  async getChatThreadId(parentChatId: string): Promise<string | null> {
    return this.chatThreadService.getThreadIdByParentChatId(parentChatId);
  }

  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    const pipeline: any[] = [
      { $match: { createdAt: { $type: 'date' }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
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
    const results = await this.parentChatModel.aggregate(pipeline).exec();
    const formatter = new Intl.DateTimeFormat('en-AU', {
      month: 'long',
      year: 'numeric',
    });
    return results.map((item: { year: number; month: number }) => {
      const date = new Date(item.year, item.month - 1, 1);
      return {
        value: `${item.year}-${String(item.month).padStart(2, '0')}`,
        label: formatter.format(date),
      };
    });
  }
}
