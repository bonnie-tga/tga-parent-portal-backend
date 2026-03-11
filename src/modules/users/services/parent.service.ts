import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole, AccessScope } from '../schemas/user.schema';
import { buildUserAccessFilter, isAdministrator } from 'src/common/access/access-filter.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { Campus } from '../../campus/schemas/campus.schema';
import { Child } from '../../children/schemas/child.schema';

@Injectable()
export class ParentService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Child.name) private childModel: Model<Child>,
  ) {}

  private normalizeId(input: any): string | null {
    if (!input) return null;
    if (typeof input === 'string') return input;
    if (input instanceof Types.ObjectId) return input.toString();
    if (typeof input === 'object') {
      if (input._id) return this.normalizeId(input._id);
      if (input.$oid) return String(input.$oid);
    }
    try {
      return String(input);
    } catch {
      return null;
    }
  }

  private toObjectIds(ids?: Array<string | Types.ObjectId | any>): Types.ObjectId[] {
    if (!ids || ids.length === 0) return [];
    const unique = Array.from(
      new Set(
        ids
          .map((x: any) => this.normalizeId(x))
          .filter((v: string | null): v is string => Boolean(v)),
      ),
    );
    return unique.map((id) => new Types.ObjectId(id));
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Ensure the role is set to parent
    createUserDto.role = UserRole.PARENT;

    // Check if email already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email '${createUserDto.email}' already exists`,
      );
    }

    // // Validate campuses if provided
    // if (createUserDto.campuses && createUserDto.campuses.length > 0) {
    //   for (const campusId of createUserDto.campuses) {
    //     const campus = await this.campusModel.findById(campusId);
    //     if (!campus) {
    //       throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    //     }
    //   }
    // }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create the parent user
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      accessScope: AccessScope.OWN_CHILDREN,
    });

    return newUser.save();
  }

  async findAll(currentUser?: User): Promise<User[]> {
    // Admin: unchanged behavior
    if (!currentUser || isAdministrator(currentUser)) {
      return this.userModel
        .find({ role: UserRole.PARENT })
        .populate('campuses', 'name')
        .populate('children', 'fullName')
        .exec();
    }

    const allowedCampuses = this.toObjectIds((currentUser as any).campuses);
    const allowedRooms = this.toObjectIds((currentUser as any).rooms);
    const allowedChildren = this.toObjectIds((currentUser as any).children);

    // If user has no assignments, return empty list
    if (
      allowedCampuses.length === 0 &&
      allowedRooms.length === 0 &&
      allowedChildren.length === 0
    ) {
      return [];
    }

    // Step 1: find matched parent ids via aggregation joining children → room/campus
    const pipeline: any[] = [
      { $match: { role: UserRole.PARENT } },
      {
        $lookup: {
          from: 'children',
          localField: 'children',
          foreignField: '_id',
          as: 'childDocs',
        },
      },
      {
        $match: {
          $or: [
            allowedCampuses.length ? { campuses: { $in: allowedCampuses } } : undefined,
            allowedChildren.length ? { children: { $in: allowedChildren } } : undefined,
            allowedRooms.length ? { rooms: { $in: allowedRooms } } : undefined,
            allowedRooms.length ? { 'childDocs.room': { $in: allowedRooms } } : undefined,
            allowedCampuses.length ? { 'childDocs.campus': { $in: allowedCampuses } } : undefined,
          ].filter(Boolean),
        },
      },
      { $project: { _id: 1 } },
    ];

    const matched = await (this.userModel as any).aggregate(pipeline).exec();
    const ids: Types.ObjectId[] = (matched || []).map((d: any) => d._id as Types.ObjectId);

    if (ids.length === 0) return [];

    // Step 2: hydrate with populates
    return this.userModel
      .find({ _id: { $in: ids } })
      .populate('campuses', 'name')
      .populate('children', 'fullName')
      .exec();
  }

  async findAllWithFilters(filters: {
    page: number;
    limit: number;
    search?: string;
    campusId?: string;
    status?: string | string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, currentUser?: User): Promise<PaginatedDto<User>> {
    const {
      page = 1,
      limit = 10,
      search,
      campusId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    // Build filter query
    const query: any = { role: UserRole.PARENT };

    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by campusId
    if (campusId) {
      query.campuses = { $in: [new Types.ObjectId(campusId)] };
    }

    // Filter by status
    if (status) {
      if (status === 'Active') {
        query.isActive = true;
      } else if (status === 'Inactive') {
        query.isActive = false;
      } else if (status === 'Pending') {
        // Define what "Pending" means in your system
        // For example, it could be users who haven't logged in yet
        query.lastLogin = null;
      } else if (Array.isArray(status)) {
        const statusConditions = [];
        if (status.includes('Active')) {
          statusConditions.push({ isActive: true });
        }
        if (status.includes('Inactive')) {
          statusConditions.push({ isActive: false });
        }
        if (status.includes('Pending')) {
          statusConditions.push({ lastLogin: null });
        }
        if (statusConditions.length > 0) {
          query.$or = statusConditions;
        }
      }
    }

    // Apply access filter (non-admin) with children join
    if (currentUser && !isAdministrator(currentUser)) {
      const allowedCampuses = this.toObjectIds((currentUser as any).campuses);
      const allowedRooms = this.toObjectIds((currentUser as any).rooms);
      const allowedChildren = this.toObjectIds((currentUser as any).children);

      if (
        allowedCampuses.length === 0 &&
        allowedRooms.length === 0 &&
        allowedChildren.length === 0
      ) {
        query._id = { $in: [] };
      } else {
        const pipeline: any[] = [
          { $match: { role: UserRole.PARENT } },
          {
            $lookup: {
              from: 'children',
              localField: 'children',
              foreignField: '_id',
              as: 'childDocs',
            },
          },
          {
            $match: {
              $or: [
                allowedCampuses.length ? { campuses: { $in: allowedCampuses } } : undefined,
                allowedChildren.length ? { children: { $in: allowedChildren } } : undefined,
                allowedRooms.length ? { rooms: { $in: allowedRooms } } : undefined,
                allowedRooms.length ? { 'childDocs.room': { $in: allowedRooms } } : undefined,
                allowedCampuses.length ? { 'childDocs.campus': { $in: allowedCampuses } } : undefined,
              ].filter(Boolean),
            },
          },
          { $project: { _id: 1 } },
        ];
        const matched = await (this.userModel as any).aggregate(pipeline).exec();
        const ids: Types.ObjectId[] = (matched || []).map((d: any) => d._id as Types.ObjectId);
        if (ids.length === 0) {
          query._id = { $in: [] };
        } else {
          query._id = { $in: ids };
        }
      }
    }

    // Create sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [parents, totalCount] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('campuses', 'name')
        .populate('children', 'fullName')
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    // Transform data to include campus and children names
    const transformedParents = parents.map((parent) => {
      // Use type assertion to tell TypeScript about the additional properties
      const parentObj = parent.toObject() as any;

      // Remove sensitive information
      delete parentObj.password;
      delete parentObj.resetPasswordToken;
      delete parentObj.resetPasswordExpires;

      // Add campus names
      parentObj.campusNames = [];
      if (parentObj.campuses && Array.isArray(parentObj.campuses)) {
        parentObj.campusNames = parentObj.campuses
          .filter(
            (campus) => campus && typeof campus === 'object' && campus.name,
          )
          .map((campus) => campus.name || '');
      }

      // Add children names
      parentObj.childrenNames = [];
      if (parentObj.children && Array.isArray(parentObj.children)) {
        parentObj.childrenNames = parentObj.children
          .filter(
            (child) =>
              child && typeof child === 'object' && (child as any).firstName,
          )
          .map((child) => {
            const firstName = (child as any).firstName || '';
            const lastName = (child as any).lastName || '';
            return `${firstName} ${lastName}`.trim();
          });
      }

      return parentObj;
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Return paginated result
    return {
      data: transformedParents,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages,
      },
    };
  }

  async findAllByCampusId(campusId: string, currentUser?: User): Promise<User[]> {
    // Validate campus exists
    const campus = await this.campusModel.findById(campusId).lean().exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Build query
    const query: any = {
      role: UserRole.PARENT,
      campuses: { $in: [new Types.ObjectId(campusId)] },
    };

    // Apply access filter for non-admin users
    if (currentUser && !isAdministrator(currentUser)) {
      const allowedCampuses = this.toObjectIds((currentUser as any).campuses);
      const allowedRooms = this.toObjectIds((currentUser as any).rooms);
      const allowedChildren = this.toObjectIds((currentUser as any).children);

      if (
        allowedCampuses.length === 0 &&
        allowedRooms.length === 0 &&
        allowedChildren.length === 0
      ) {
        return [];
      }

      // Check if user has access to this campus
      const hasCampusAccess = allowedCampuses.some(
        (campus) => campus.toString() === campusId,
      );

      if (!hasCampusAccess && allowedRooms.length === 0 && allowedChildren.length === 0) {
        return [];
      }

      // If user has access via rooms or children, use aggregation
      if (!hasCampusAccess && (allowedRooms.length > 0 || allowedChildren.length > 0)) {
        const pipeline: any[] = [
          { $match: { role: UserRole.PARENT, campuses: { $in: [new Types.ObjectId(campusId)] } } },
          {
            $lookup: {
              from: 'children',
              localField: 'children',
              foreignField: '_id',
              as: 'childDocs',
            },
          },
          {
            $match: {
              $or: [
                allowedChildren.length ? { children: { $in: allowedChildren } } : undefined,
                allowedRooms.length ? { 'childDocs.room': { $in: allowedRooms } } : undefined,
              ].filter(Boolean),
            },
          },
          { $project: { _id: 1 } },
        ];

        const matched = await (this.userModel as any).aggregate(pipeline).exec();
        const ids: Types.ObjectId[] = (matched || []).map((d: any) => d._id as Types.ObjectId);

        if (ids.length === 0) {
          return [];
        }

        query._id = { $in: ids };
      }
    }

    // Fetch parents
    return this.userModel
      .find(query)
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .populate('children', 'fullName')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  async findAllByChildId(childId: string, currentUser?: User): Promise<User[]> {
    const child = await this.childModel.findById(childId).lean().exec();
    if (!child) {
      throw new NotFoundException(`Child with ID '${childId}' not found`);
    }
    const parentIds = this.toObjectIds((child.parents || []) as any);
    if (parentIds.length === 0) {
      return [];
    }
    const query: any = {
      role: UserRole.PARENT,
      _id: { $in: parentIds },
    };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        query.$and = query.$and || [];
        query.$and.push(access);
      }
    }
    return this.userModel
      .find(query)
      .populate('campuses', 'name')
      .populate('children', 'fullName')
      .exec();
  }

  async findOne(id: string, currentUser?: User): Promise<User> {
    const baseFilter: any = { _id: id, role: UserRole.PARENT };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        baseFilter.$and = baseFilter.$and || [];
        baseFilter.$and.push(access);
      }
    }
    const parent = await this.userModel
      .findOne(baseFilter)
      .populate('campuses', 'name')
      .populate('children', 'fullName')
      .exec();

    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    return parent;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const parent = await this.userModel.findOne({
      _id: id,
      role: UserRole.PARENT,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    // If email is being changed, check if it's already in use
    if (updateUserDto.email && updateUserDto.email !== parent.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email,
      });
      if (existingUser) {
        throw new ConflictException(
          `User with email '${updateUserDto.email}' already exists`,
        );
      }
    }

    // Validate campuses if provided
    if (updateUserDto.campuses && updateUserDto.campuses.length > 0) {
      for (const campusId of updateUserDto.campuses) {
        const campus = await this.campusModel.findById(campusId);
        if (!campus) {
          throw new NotFoundException(`Campus with ID '${campusId}' not found`);
        }
      }
    }

    // Hash the password if it's being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update the parent
    const updatedParent = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .populate('campuses', 'name')
      .populate('children', 'fullName')
      .exec();

    return updatedParent;
  }

  async remove(id: string): Promise<void> {
    const parent = await this.userModel.findOne({
      _id: id,
      role: UserRole.PARENT,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    await this.userModel.deleteOne({ _id: id }).exec();
  }

  async activate(id: string): Promise<User> {
    const parent = await this.userModel.findOne({
      _id: id,
      role: UserRole.PARENT,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    parent.isActive = true;
    return parent.save();
  }

  async deactivate(id: string): Promise<User> {
    const parent = await this.userModel.findOne({
      _id: id,
      role: UserRole.PARENT,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    parent.isActive = false;
    return parent.save();
  }

  async findChildrenByParentId(
    parentId: string,
    currentUser?: User,
  ): Promise<Child[]> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException(`Invalid parent ID '${parentId}'`);
    }
    const parent = await this.userModel.findOne({
      _id: parentId,
      role: UserRole.PARENT,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID '${parentId}' not found`);
    }
    const query: any = {
      parents: { $in: [new Types.ObjectId(parentId)] },
    };
    return this.childModel
      .find(query)
      .populate('campus', 'name')
      .populate('room', 'name')
      .exec();
  }

  // async addChildToParent(parentId: string, childId: string): Promise<User> {
  //   const parent = await this.userModel.findOne({ _id: parentId, role: UserRole.PARENT });
  //   if (!parent) {
  //     throw new NotFoundException(`Parent with ID '${parentId}' not found`);
  //   }

  //   const child = await this.childModel.findById(childId);
  //   if (!child) {
  //     throw new NotFoundException(`Child with ID '${childId}' not found`);
  //   }

  //   // Check if child is already assigned to parent
  //   const childObjectId = new MongooseSchema.Types.ObjectId(childId);
  //   if (parent.children.some(id => id.toString() === childObjectId.toString())) {
  //     throw new ConflictException(`Child with ID '${childId}' is already assigned to this parent`);
  //   }

  //   // Add child to parent
  //   parent.children.push(childObjectId);

  //   // Also add parent to child's parents array
  //   const parentObjectId = new MongooseSchema.Types.ObjectId(parentId);
  //   if (!child.parents.some(id => id.toString() === parentObjectId.toString())) {
  //     child.parents.push(parentObjectId);
  //     await child.save();
  //   }

  //   return parent.save();
  // }

  // async removeChildFromParent(parentId: string, childId: string): Promise<User> {
  //   const parent = await this.userModel.findOne({ _id: parentId, role: UserRole.PARENT });
  //   if (!parent) {
  //     throw new NotFoundException(`Parent with ID '${parentId}' not found`);
  //   }

  //   const child = await this.childModel.findById(childId);
  //   if (!child) {
  //     throw new NotFoundException(`Child with ID '${childId}' not found`);
  //   }

  //   // Remove child from parent
  //   parent.children = parent.children.filter(id => id.toString() !== childId);

  //   // Also remove parent from child's parents array
  //   child.parents = child.parents.filter(id => id.toString() !== parentId);
  //   await child.save();

  //   return parent.save();
  // }
}
