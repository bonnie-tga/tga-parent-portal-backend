import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Child } from '../schemas/child.schema';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto/update-child.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { User, UserRole } from '../../users/schemas/user.schema';
import { buildChildFilter } from 'src/common/access/access-filter.util';
import { ImmunisationReminderService } from '../../immunisation-reminder/services/immunisation-reminder.service';

@Injectable()
export class ChildService {
  constructor(
    @InjectModel(Child.name) private childModel: Model<Child>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => ImmunisationReminderService))
    private immunisationReminderService?: ImmunisationReminderService,
  ) {}

  async create(createChildDto: CreateChildDto): Promise<Child> {
    const newChild = new this.childModel(createChildDto);
    const savedChild = await newChild.save();

    if (createChildDto.parents && createChildDto.parents.length > 0) {
      const parentIds = createChildDto.parents.map((parentId) => new Types.ObjectId(parentId));

      const update: any = {
        $addToSet: {
          children: savedChild._id,
          campuses: new Types.ObjectId(createChildDto.campus),
          ...(createChildDto.room
            ? { rooms: new Types.ObjectId(createChildDto.room) }
            : {}),
        },
      };

      await this.userModel.updateMany(
        { _id: { $in: parentIds }, role: UserRole.PARENT },
        update,
      );
    }

    return savedChild;
  }

  async findAll(user?: User): Promise<Child[]> {
    let query: any = {};
    if (user) {
      const access = buildChildFilter(user as any);
      query = { ...query, ...access };
    }
    return this.childModel.find(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();
  }

  async findMyAssignedChildren(user: User): Promise<Child[]> {
    const access = buildChildFilter(user as any);
    return this.childModel.find(access)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();
  }

  async findAllWithFilters(filters: {
    page: number;
    limit: number;
    search?: string;
    campusId?: string;
    campusName?: string;
    roomId?: string;
    roomName?: string;
    status?: string | string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    noConcent?: boolean;
  }, user?: User): Promise<PaginatedDto<Child>> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      campusId,
      roomId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      noConcent
    } = filters;
    
    const skip = (page - 1) * limit;
    
    // Build filter query
    let query: any = {};
    
    // Search by name
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by campusId
    if (campusId) {
      query.campus = campusId;
    }
    
    // Filter by roomId
    if (roomId) {
      query.room = roomId;
    }
    
    // Filter by noConcent
    if (noConcent !== undefined) {
      query.noConcent = noConcent;
    }
    
    // Apply access filter based on user's role/scope
    if (user) {
      const access = buildChildFilter(user as any);
      query = { ...query, ...access };
    }
    
    // Create sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const [children, totalCount] = await Promise.all([
      this.childModel.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('campus', 'name')
        .populate('room', 'name')
        .populate('parents', 'firstName lastName email')
        .exec(),
      this.childModel.countDocuments(query)
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    // Return paginated result
    return {
      data: children,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages
      }
    };
  }

  async findOne(id: string, user?: User): Promise<any> {
let query: any = { _id: id };

// Apply access filter based on user's role/scope
if (user) {
  const access = buildChildFilter(user as any);
  query = { ...query, ...access };
}

    const child = await this.childModel.findOne(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .lean()
      .exec();
      
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    // Get immunisation history for this child
    let immunisationHistory = [];
    if (this.immunisationReminderService) {
      try {
        immunisationHistory = await this.immunisationReminderService.findByChild(id, user);
      } catch (error) {
        // If service is not available or error occurs, just continue without history
        console.warn('Failed to fetch immunisation history:', error);
      }
    }
    
    // Return child with immunisation history
    return {
      ...child,
      immunisationHistory,
    };
  }

  async findByCampus(campusId: string, user?: User): Promise<Child[]> {
    let query: any = { campus: campusId };
    if (user) {
      const access = buildChildFilter(user as any);
      query = { ...query, ...access };
    }
    
    return this.childModel.find(query)
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();
  }

  async findByRoom(roomId: string, user?: User): Promise<Child[]> {
    let query: any = { room: roomId };
    if (user) {
      const access = buildChildFilter(user as any);
      query = { ...query, ...access };
    }
    return this.childModel.find(query)
      .populate('campus', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();
  }

  async findByMultipleRooms(roomIds: string[], user?: User): Promise<Child[]> {
    let query: any = { room: { $in: roomIds } };
    if (user) {
      const access = buildChildFilter(user as any);
      query = { ...query, ...access };
    }
    return this.childModel.find(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();
  }

  async update(id: string, updateChildDto: UpdateChildDto): Promise<Child> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    const oldCampusId = child.campus ? child.campus.toString() : undefined;
    const oldRoomId = child.room ? child.room.toString() : undefined;
    const oldParentIds = (child.parents ?? []).map((parentId) => parentId.toString());

    const newCampusId = updateChildDto.campus ?? oldCampusId;
    const newRoomId = updateChildDto.room ?? oldRoomId;
    const newParentIds = updateChildDto.parents
      ? updateChildDto.parents.map((parentId) => parentId.toString())
      : oldParentIds;

    const updatedChild = await this.childModel
      .findByIdAndUpdate(id, updateChildDto, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('parents', 'firstName lastName email')
      .exec();

    const childId = child._id;

    if (newParentIds.length > 0) {
      const parentObjectIds = newParentIds.map((parentId) => new Types.ObjectId(parentId));
      const addToSet: Record<string, any> = {
        children: childId,
      };

      if (newCampusId) {
        addToSet.campuses = new Types.ObjectId(newCampusId);
      }

      if (newRoomId) {
        addToSet.rooms = new Types.ObjectId(newRoomId);
      }

      await this.userModel.updateMany(
        { _id: { $in: parentObjectIds }, role: UserRole.PARENT },
        { $addToSet: addToSet },
      );
    }

    const removedParentIds = oldParentIds.filter((parentId) => !newParentIds.includes(parentId));
    const existingParentIds = newParentIds.filter((parentId) => oldParentIds.includes(parentId));

    if (removedParentIds.length > 0) {
      const removedParentObjectIds = removedParentIds.map((parentId) => new Types.ObjectId(parentId));

      await this.userModel.updateMany(
        { _id: { $in: removedParentObjectIds }, role: UserRole.PARENT },
        { $pull: { children: childId } },
      );

      await Promise.all(
        removedParentObjectIds.map(async (parentId) => {
          const pullUpdates: Record<string, Types.ObjectId> = {};

          if (oldCampusId) {
            const hasCampusChild = await this.childModel.exists({
              parents: parentId,
              campus: new Types.ObjectId(oldCampusId),
            });

            if (!hasCampusChild) {
              pullUpdates.campuses = new Types.ObjectId(oldCampusId);
            }
          }

          if (oldRoomId) {
            const hasRoomChild = await this.childModel.exists({
              parents: parentId,
              room: new Types.ObjectId(oldRoomId),
            });

            if (!hasRoomChild) {
              pullUpdates.rooms = new Types.ObjectId(oldRoomId);
            }
          }

          if (Object.keys(pullUpdates).length > 0) {
            await this.userModel.updateOne(
              { _id: parentId, role: UserRole.PARENT },
              { $pull: pullUpdates },
            );
          }
        }),
      );
    }

    const campusChanged = oldCampusId && newCampusId && oldCampusId !== newCampusId;
    const roomChanged = oldRoomId && newRoomId && oldRoomId !== newRoomId;

    if ((campusChanged || roomChanged) && existingParentIds.length > 0) {
      const existingParentObjectIds = existingParentIds.map(
        (parentId) => new Types.ObjectId(parentId),
      );

      await Promise.all(
        existingParentObjectIds.map(async (parentId) => {
          const pullUpdates: Record<string, Types.ObjectId> = {};

          if (campusChanged && oldCampusId) {
            const hasCampusChild = await this.childModel.exists({
              parents: parentId,
              campus: new Types.ObjectId(oldCampusId),
            });

            if (!hasCampusChild) {
              pullUpdates.campuses = new Types.ObjectId(oldCampusId);
            }
          }

          if (roomChanged && oldRoomId) {
            const hasRoomChild = await this.childModel.exists({
              parents: parentId,
              room: new Types.ObjectId(oldRoomId),
            });

            if (!hasRoomChild) {
              pullUpdates.rooms = new Types.ObjectId(oldRoomId);
            }
          }

          if (Object.keys(pullUpdates).length > 0) {
            await this.userModel.updateOne(
              { _id: parentId, role: UserRole.PARENT },
              { $pull: pullUpdates },
            );
          }
        }),
      );
    }

    return updatedChild;
  }

  async remove(id: string): Promise<void> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    const parentIds = (child.parents ?? []).map((parentId) =>
      new Types.ObjectId(parentId.toString()),
    );

    await this.childModel.deleteOne({ _id: id }).exec();

    if (parentIds.length === 0) {
      return;
    }

    await this.userModel.updateMany(
      { _id: { $in: parentIds }, role: UserRole.PARENT },
      { $pull: { children: child._id } },
    );

    await Promise.all(
      parentIds.map(async (parentId) => {
        const pullUpdates: Record<string, Types.ObjectId> = {};

        const hasCampusChild = await this.childModel.exists({
          parents: parentId,
          campus: child.campus,
        });

        if (!hasCampusChild && child.campus) {
          const campusId = child.campus.toString();
          pullUpdates.campuses = new Types.ObjectId(campusId);
        }

        if (child.room) {
          const hasRoomChild = await this.childModel.exists({
            parents: parentId,
            room: child.room,
          });

          if (!hasRoomChild) {
            const roomId = child.room.toString();
            pullUpdates.rooms = new Types.ObjectId(roomId);
          }
        }

        if (Object.keys(pullUpdates).length > 0) {
          await this.userModel.updateOne(
            { _id: parentId, role: UserRole.PARENT },
            { $pull: pullUpdates },
          );
        }
      }),
    );
  }

  async activate(id: string): Promise<Child> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    child.isActive = true;
    return child.save();
  }

  async deactivate(id: string): Promise<Child> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    child.isActive = false;
    return child.save();
  }

  async archive(id: string): Promise<Child> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    child.isArchived = true;
    return child.save();
  }

  async unarchive(id: string): Promise<Child> {
    const child = await this.childModel.findById(id).exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${id}' not found`);
    }

    child.isArchived = false;
    return child.save();
  }
}
