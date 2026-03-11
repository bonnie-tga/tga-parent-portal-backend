import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { AccountChat, AccountChatStatus, AccountChatDecisionStatus } from '../schemas/account-chat.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';
import { QueryAccountChatDto } from '../dto/query-account-chat.dto';
import { CreateAccountChatDto } from '../dto/create-account-chat.dto';
import { UpdateAccountChatDto } from '../dto/update-account-chat.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { ChatThreadService } from '../../chat/services/chat-thread.service';
import { ChatMessageService } from '../../chat/services/chat-message.service';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../../chat/schemas/chat-thread.schema';
import { isAdministrator } from 'src/common/access/access-filter.util';
import { buildDateFilter } from 'src/common/utils/chat.util';
import { objectIdInArray } from 'src/utils/mongoose-helper';

type AccountChatWithUnreadCount = any;

@Injectable()
export class AccountChatService {
  constructor(
    @InjectModel(AccountChat.name) private accountChatModel: Model<AccountChat>,
    @InjectModel(Child.name) private childModel: Model<Child>,
    @InjectModel(User.name) private userModel: Model<User>,
    private chatThreadService: ChatThreadService,
    private chatMessageService: ChatMessageService,
  ) {}

  async create(dto: CreateAccountChatDto, currentUser: User): Promise<AccountChat> {
    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.ENROLMENTS,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Access denied. Only Administrator, Area Manager, and Enrolment can create account chats.');
    }

    if (!dto.children) {
      throw new NotFoundException('Child ID is required');
    }

    const child = await this.childModel.findById(dto.children);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const childId = new Types.ObjectId(dto.children);

    const initialParentIds = new Set<Types.ObjectId>();

    if (child.parents && Array.isArray(child.parents)) {
      child.parents.forEach((parentId: any) => {
        initialParentIds.add(new Types.ObjectId(parentId.toString()));
      });
    }

    if (dto.members && Array.isArray(dto.members)) {
      dto.members.forEach((id: string) => {
        initialParentIds.add(new Types.ObjectId(id));
      });
    }

    const allChildrenOfParents = await this.childModel
      .find({
        parents: { $in: Array.from(initialParentIds) },
        isActive: true,
      })
      .select('_id parents campus room')
      .lean()
      .exec();

    const childrenIdsSet = new Set<string>();
    allChildrenOfParents.forEach((childDoc: any) => {
      childrenIdsSet.add(childDoc._id.toString());
    });
    const allChildrenIds: Types.ObjectId[] = Array.from(childrenIdsSet).map(id => 
      new Types.ObjectId(id)
    );

    const allParentIdsSet = new Set<string>();

    allChildrenOfParents.forEach((childDoc: any) => {
      if (childDoc.parents && Array.isArray(childDoc.parents)) {
        childDoc.parents.forEach((parentId: any) => {
          allParentIdsSet.add(parentId.toString());
        });
      }
    });

    const campusSet = new Set<string>();
    const roomSet = new Set<string>();

    allChildrenOfParents.forEach((childDoc: any) => {
      if (childDoc.campus) {
        campusSet.add(childDoc.campus.toString());
      }
      if (childDoc.room) {
        roomSet.add(childDoc.room.toString());
      }
    });

    if (dto.campus) {
      campusSet.add(dto.campus.toString());
    }
    if (dto.room) {
      roomSet.add(dto.room.toString());
    }

    const campusArray = Array.from(campusSet).map(id => new Types.ObjectId(id));
    const roomArray = Array.from(roomSet).map(id => new Types.ObjectId(id));

    const accountUsers = await this.userModel
      .find({
        role: { $in: [UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.ENROLMENTS] },
        isDeleted: { $ne: true },
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    accountUsers.forEach((user: any) => {
      allParentIdsSet.add(user._id.toString());
    });

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

    const selectedParentId = dto.members && dto.members.length > 0 
      ? new Types.ObjectId(dto.members[0])
      : (child.parents && child.parents.length > 0 
          ? new Types.ObjectId(child.parents[0].toString())
          : null);

    const membersSet = new Set<string>(allParentIdsSet);
    if (selectedParentId) {
      membersSet.delete(selectedParentId.toString());
    }

    const membersArray = Array.from(membersSet).map(id => new Types.ObjectId(id));
    if (selectedParentId) {
      membersArray.unshift(selectedParentId);
    }

    // Check if account chat already exists with same selected child and selected parent
    if (selectedParentId) {
      const existingChat = await this.accountChatModel
        .findOne({
          children: { $in: [childId] },
          members: { $in: [selectedParentId] },
          isDeleted: { $ne: true },
        })
        .exec();

      if (existingChat) {
        throw new ConflictException('An account chat already exists for this child and parent. Please use the existing chat.');
      }
    }

    const finalStatus = dto.status || AccountChatStatus.PUBLISHED;
    const publishAt = finalStatus === AccountChatStatus.PUBLISHED ? new Date() : null;

    const accountChat = new this.accountChatModel({
      campus: campusArray,
      room: roomArray,
      children: childrenArray,
      members: membersArray,
      status: finalStatus,
      decisionStatus: dto.decisionStatus || AccountChatDecisionStatus.OPEN,
      newMessage: 0,
      publishAt,
      createdBy: currentUser._id,
    });

    await accountChat.save();

    try {
      const chatThreadStatus = dto.status === AccountChatStatus.DRAFT 
        ? ChatThreadStatus.DRAFT 
        : ChatThreadStatus.PUBLISHED;
      const chatThreadDecisionStatus = dto.decisionStatus === AccountChatDecisionStatus.CLOSE
        ? ChatThreadDecisionStatus.CLOSE
        : ChatThreadDecisionStatus.OPEN;

      await this.chatThreadService.create(
        {
          type: ChatThreadType.ACCOUNT,
          refId: accountChat._id.toString(),
          refModel: 'AccountChat',
          campus: campusArray.length > 0 ? campusArray[0].toString() : undefined,
          room: roomArray.length > 0 ? roomArray[0].toString() : undefined,
          members: membersArray.map((id) => id.toString()),
          status: chatThreadStatus,
          decisionStatus: chatThreadDecisionStatus,
          metadata: {
            childrenIds: childrenArray.map((id) => id.toString()),
            campusIds: campusArray.map((id) => id.toString()),
            roomIds: roomArray.map((id) => id.toString()),
          },
        },
        currentUser,
      );
    } catch (error) {
    }

    const populated = await this.accountChatModel
      .findById(accountChat._id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate({
        path: 'children',
        select: 'fullName',
        populate: [
          { path: 'campus', select: 'name' },
          { path: 'room', select: 'name' },
        ],
      })
      .populate('members', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName')
      .exec();

    return populated;
  }

  async findAll(query: QueryAccountChatDto, currentUser: User): Promise<PaginatedDto<AccountChatWithUnreadCount>> {
    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.ENROLMENTS,
    ];

    if (!allowedRoles.includes(currentUser.role) && currentUser.role !== UserRole.PARENT) {
      throw new ForbiddenException('Access denied');
    }

    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<AccountChat> = {
      isDeleted: { $ne: true },
    };

    if (search) {
      const searchConditions: FilterQuery<AccountChat>[] = [];

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
      const campusId = Types.ObjectId.isValid(campus) ? new Types.ObjectId(campus) : campus;
      filter.campus = { $in: [campusId] };
    }
    if (room) {
      const roomId = Types.ObjectId.isValid(room) ? new Types.ObjectId(room) : room;
      filter.room = { $in: [roomId] };
    }
    if (decisionStatus) filter.decisionStatus = decisionStatus;

    const dateFilter = buildDateFilter(month, year, dates);
    if (Object.keys(dateFilter).length > 0) {
      filter = { ...filter, ...dateFilter };
    }

    if (currentUser.role === UserRole.PARENT) {
      filter.members = currentUser._id;
    }

    const [data, totalCount] = await Promise.all([
      this.accountChatModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate({
        path: 'children',
        select: 'fullName',
        populate: [
          { path: 'campus', select: 'name' },
          { path: 'room', select: 'name' },
        ],
      })
        .populate('members', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.accountChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.getChatThreadId(chat._id.toString());
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

  async findMyChats(query: QueryAccountChatDto, currentUser: User): Promise<PaginatedDto<AccountChatWithUnreadCount>> {
    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<AccountChat> = {
      members: currentUser._id,
      isDeleted: { $ne: true },
      status: AccountChatStatus.PUBLISHED,
    };

    if (search) {
      const searchConditions: FilterQuery<AccountChat>[] = [];

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
      const campusId = Types.ObjectId.isValid(campus) ? new Types.ObjectId(campus) : campus;
      filter.campus = { $in: [campusId] };
    }
    if (room) {
      const roomId = Types.ObjectId.isValid(room) ? new Types.ObjectId(room) : room;
      filter.room = { $in: [roomId] };
    }
    if (decisionStatus) filter.decisionStatus = decisionStatus;

    const dateFilter = buildDateFilter(month, year, dates);
    if (Object.keys(dateFilter).length > 0) {
      filter = { ...filter, ...dateFilter };
    }

    filter.status = AccountChatStatus.PUBLISHED;

    const [data, totalCount] = await Promise.all([
      this.accountChatModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate({
        path: 'children',
        select: 'fullName',
        populate: [
          { path: 'campus', select: 'name' },
          { path: 'room', select: 'name' },
        ],
      })
        .populate('members', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.accountChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.getChatThreadId(chat._id.toString());
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

  async findById(id: string, currentUser: User): Promise<AccountChat> {
    const accountChat = await this.accountChatModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate({
        path: 'children',
        select: 'fullName',
        populate: [
          { path: 'campus', select: 'name' },
          { path: 'room', select: 'name' },
        ],
      })
      .populate('members', 'firstName lastName email role')
      .exec();

    if (!accountChat) {
      throw new NotFoundException('Account chat not found');
    }

    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.ENROLMENTS,
    ];

    if (allowedRoles.includes(currentUser.role)) {
      return accountChat;
    }

    if (currentUser.role === UserRole.PARENT) {
      const isMember = objectIdInArray(currentUser._id, accountChat.members as any);
      if (isMember) {
        return accountChat;
      }
      throw new ForbiddenException('Access denied');
    }

    throw new ForbiddenException('Access denied');
  }

  async update(id: string, dto: UpdateAccountChatDto, currentUser: User): Promise<AccountChat> {
    throw new NotFoundException('Method not implemented.');
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const accountChat = await this.accountChatModel.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!accountChat) {
      throw new NotFoundException('Account chat not found');
    }

    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Access denied');
    }

    await this.accountChatModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: currentUser._id,
    });
  }

  async getChatThreadId(accountChatId: string): Promise<string | null> {
    const thread = await this.chatThreadService.findByRefId(accountChatId, 'AccountChat');
    return thread ? thread._id.toString() : null;
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
    const results = await this.accountChatModel.aggregate(pipeline).exec();
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
