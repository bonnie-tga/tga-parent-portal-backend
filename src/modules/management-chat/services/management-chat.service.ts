import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { ManagementChat, ManagementChatStatus, ManagementChatDecisionStatus } from '../schemas/management-chat.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Child } from '../../children/schemas/child.schema';
import { QueryManagementChatDto } from '../dto/query-management-chat.dto';
import { CreateManagementChatDto } from '../dto/create-management-chat.dto';
import { UpdateManagementChatDto } from '../dto/update-management-chat.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { ChatThreadService } from '../../chat/services/chat-thread.service';
import { ChatMessageService } from '../../chat/services/chat-message.service';
import { ChatThreadType, ChatThreadStatus, ChatThreadDecisionStatus } from '../../chat/schemas/chat-thread.schema';
import { isAdministrator, hasCampusAccess, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';
import { buildDateFilter } from 'src/common/utils/chat.util';
import { objectIdInArray } from 'src/utils/mongoose-helper';

type ManagementChatWithUnreadCount = any;

@Injectable()
export class ManagementChatService {
  constructor(
    @InjectModel(ManagementChat.name) private managementChatModel: Model<ManagementChat>,
    @InjectModel(Child.name) private childModel: Model<Child>,
    @InjectModel(User.name) private userModel: Model<User>,
    private chatThreadService: ChatThreadService,
    private chatMessageService: ChatMessageService,
  ) {}

  async create(dto: CreateManagementChatDto, currentUser: User): Promise<ManagementChat> {
    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Access denied. Only Administrator, Area Manager, Director, Assistant Director, and Educational Leader can create management chats.');
    }

    if (!dto.children) {
      throw new NotFoundException('Child ID is required');
    }

    if (!dto.campus) {
      throw new NotFoundException('Campus ID is required');
    }

    const child = await this.childModel.findById(dto.children);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const campusId = new Types.ObjectId(dto.campus);

    if (!isAdministrator(currentUser)) {
      if (!hasCampusAccess(currentUser as any, campusId)) {
        throw new ForbiddenException('Access denied. You do not have access to this campus.');
      }
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

    campusSet.add(campusId.toString());
    if (dto.room) {
      roomSet.add(dto.room.toString());
    }

    const campusArray = Array.from(campusSet).map(id => new Types.ObjectId(id));
    const roomArray = Array.from(roomSet).map(id => new Types.ObjectId(id));

    const administratorUsers = await this.userModel
      .find({
        role: UserRole.ADMINISTRATOR,
        isDeleted: { $ne: true },
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    administratorUsers.forEach((user: any) => {
      allParentIdsSet.add(user._id.toString());
    });

    const areaManagerUsers = await this.userModel
      .find({
        role: UserRole.AREA_MANAGER,
        campuses: campusId,
        isDeleted: { $ne: true },
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    areaManagerUsers.forEach((user: any) => {
      allParentIdsSet.add(user._id.toString());
    });

    const managementUsers = await this.userModel
      .find({
        role: { $in: [UserRole.DIRECTOR, UserRole.ASSISTANT_DIRECTOR, UserRole.EDUCATIONAL_LEADER] },
        campuses: campusId,
        isDeleted: { $ne: true },
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    managementUsers.forEach((user: any) => {
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

    if (selectedParentId) {
      const existingChat = await this.managementChatModel
        .findOne({
          children: { $in: [childId] },
          members: { $in: [selectedParentId] },
          campus: { $in: [campusId] },
          isDeleted: { $ne: true },
        })
        .exec();

      if (existingChat) {
        throw new ConflictException('A management chat already exists for this child, parent, and campus. Please use the existing chat.');
      }
    }

    const finalStatus = dto.status || ManagementChatStatus.PUBLISHED;
    const publishAt = finalStatus === ManagementChatStatus.PUBLISHED ? new Date() : null;

    const managementChat = new this.managementChatModel({
      campus: campusArray,
      room: roomArray,
      children: childrenArray,
      members: membersArray,
      status: finalStatus,
      decisionStatus: dto.decisionStatus || ManagementChatDecisionStatus.OPEN,
      newMessage: 0,
      publishAt,
      createdBy: currentUser._id,
    });

    await managementChat.save();

    try {
      const chatThreadStatus = dto.status === ManagementChatStatus.DRAFT 
        ? ChatThreadStatus.DRAFT 
        : ChatThreadStatus.PUBLISHED;
      const chatThreadDecisionStatus = dto.decisionStatus === ManagementChatDecisionStatus.CLOSE
        ? ChatThreadDecisionStatus.CLOSE
        : ChatThreadDecisionStatus.OPEN;

      await this.chatThreadService.create(
        {
          type: ChatThreadType.MANAGEMENT,
          refId: managementChat._id.toString(),
          refModel: 'ManagementChat',
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

    const populated = await this.managementChatModel
      .findById(managementChat._id)
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
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .populate('createdBy', 'firstName lastName')
      .exec();

    return populated;
  }

  async findAll(query: QueryManagementChatDto, currentUser: User): Promise<PaginatedDto<ManagementChatWithUnreadCount>> {
    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
    ];

    if (!allowedRoles.includes(currentUser.role) && currentUser.role !== UserRole.PARENT) {
      throw new ForbiddenException('Access denied');
    }

    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<ManagementChat> = {
      isDeleted: { $ne: true },
    };

    if (!isAdministrator(currentUser)) {
      const campusFilter = buildStrictCampusInFilterByIds(currentUser.campuses, 'campus');
      if (Object.keys(campusFilter).length > 0) {
        filter = { ...filter, ...campusFilter };
      } else {
        filter._id = { $in: [] };
      }
    }

    if (search) {
      const searchConditions: FilterQuery<ManagementChat>[] = [];

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
      filter.status = ManagementChatStatus.PUBLISHED;
    }

    const [data, totalCount] = await Promise.all([
      this.managementChatModel
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
        .populate({
          path: 'members',
          select: 'firstName lastName email role',
          populate: {
            path: 'campuses',
            select: 'name',
          },
        })
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.managementChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.chatThreadService.getThreadIdByManagementChatId(chat._id.toString());
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

  async findMyChats(query: QueryManagementChatDto, currentUser: User): Promise<PaginatedDto<ManagementChatWithUnreadCount>> {
    const { page = 1, limit = 10, search, campus, room, messages, decisionStatus, month, year, dates } = query;
    const skip = (page - 1) * limit;

    let filter: FilterQuery<ManagementChat> = {
      members: currentUser._id,
      isDeleted: { $ne: true },
      status: ManagementChatStatus.PUBLISHED,
    };

    if (search) {
      const searchConditions: FilterQuery<ManagementChat>[] = [];

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

    filter.status = ManagementChatStatus.PUBLISHED;

    const [data, totalCount] = await Promise.all([
      this.managementChatModel
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
        .populate({
          path: 'members',
          select: 'firstName lastName email role',
          populate: {
            path: 'campuses',
            select: 'name',
          },
        })
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .exec(),
      this.managementChatModel.countDocuments(filter),
    ]);

    const dataWithUnreadCount = await Promise.all(
      data.map(async (chat) => {
        const threadId = await this.chatThreadService.getThreadIdByManagementChatId(chat._id.toString());
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

  async findById(id: string, currentUser: User): Promise<ManagementChat> {
    const managementChat = await this.managementChatModel
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
      .populate({
        path: 'members',
        select: 'firstName lastName email role',
        populate: {
          path: 'campuses',
          select: 'name',
        },
      })
      .exec();

    if (!managementChat) {
      throw new NotFoundException('Management chat not found');
    }

    if (isAdministrator(currentUser)) {
      return managementChat;
    }

    const allowedRoles = [
      UserRole.AREA_MANAGER,
      UserRole.DIRECTOR,
      UserRole.ASSISTANT_DIRECTOR,
      UserRole.EDUCATIONAL_LEADER,
    ];

    if (allowedRoles.includes(currentUser.role)) {
      const firstCampus = Array.isArray(managementChat.campus) && managementChat.campus.length > 0
        ? managementChat.campus[0]
        : managementChat.campus;
      
      if (hasCampusAccess(currentUser as any, firstCampus)) {
        return managementChat;
      }
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === UserRole.PARENT) {
      const isMember = objectIdInArray(currentUser._id, managementChat.members as any);
      if (isMember) {
        return managementChat;
      }
      throw new ForbiddenException('Access denied');
    }

    throw new ForbiddenException('Access denied');
  }

  async update(id: string, dto: UpdateManagementChatDto, currentUser: User): Promise<ManagementChat> {
    throw new NotFoundException('Method not implemented.');
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const managementChat = await this.managementChatModel.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!managementChat) {
      throw new NotFoundException('Management chat not found');
    }

    const allowedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.AREA_MANAGER,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!isAdministrator(currentUser)) {
      const firstCampus = Array.isArray(managementChat.campus) && managementChat.campus.length > 0
        ? managementChat.campus[0]
        : managementChat.campus;
      
      if (!hasCampusAccess(currentUser as any, firstCampus)) {
        throw new ForbiddenException('Access denied');
      }
    }

    await this.managementChatModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: currentUser._id,
    });
  }

  async getChatThreadId(managementChatId: string): Promise<string | null> {
    const thread = await this.chatThreadService.findByRefId(managementChatId, 'Management');
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
    const results = await this.managementChatModel.aggregate(pipeline).exec();
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
