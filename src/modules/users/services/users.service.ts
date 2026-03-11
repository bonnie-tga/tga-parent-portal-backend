import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole, AccessScope } from '../schemas/user.schema';
import { buildUserAccessFilter, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Role } from '../schemas/role.schema';
import bcrypt from 'bcrypt';
import { UserDocument, UserWithPermissions, UsersFilterOptions, UsersPaginationOptions, UsersSortOptions, UsersResponse, UserStats, RoleInfo } from '../interface/user.interface';
import { FeedService } from '../../feed/feed.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private feedService: FeedService,
  ) {}

  async getStats(): Promise<UserStats> {
    // Get total users count
    const totalUsers = await this.userModel.countDocuments({ isDeleted: { $ne: true } });
    
    // Get active users count
    const activeUsers = await this.userModel.countDocuments({ isActive: true, isDeleted: { $ne: true } });
    
    // Get inactive users count
    const inactiveUsers = await this.userModel.countDocuments({ isActive: false, isDeleted: { $ne: true } });
    
    // Get administrators count
    const administrators = await this.userModel.countDocuments({ role: UserRole.ADMINISTRATOR, isDeleted: { $ne: true } });
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      administrators,
    };
  }
  
  async getRoles(): Promise<RoleInfo[]> {
    // Get all roles from the database
    const roles = await this.roleModel.find().lean();
    
    // Create role info for each role
    const roleInfoPromises = roles.map(async (role: any) => {
      // Count users assigned to this role
      const usersAssigned = await this.userModel.countDocuments({ role: role.name, isDeleted: { $ne: true } });
      
      // Ensure we have a valid createdAt date
      const createdAt = role.createdAt instanceof Date ? role.createdAt : new Date();
      
      return {
        name: role.name,
        isSystemRole: role.isSystemRole,
        description: role.description,
        accessScope: role.accessScope,
        usersAssigned,
        permissions: role.permissions,
        details: role.details || [],
        createdAt: createdAt
      };
    });
    
    return Promise.all(roleInfoPromises);
  }

  async getUserById(userId: string): Promise<UserWithPermissions> {
    // Find the user
    const user = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } }).select('-password').lean();
    
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }
    
    // Find the role with its permissions
    const role = await this.roleModel.findOne({ name: user.role }).lean();
    
    if (!role) {
      throw new NotFoundException(`Role '${user.role}' not found`);
    }
    
    // Convert Mongoose document to plain object and add role details
    const userData = JSON.parse(JSON.stringify(user));
    
    // Add role details to the user object
    const userWithPermissions = {
      ...userData,
      _id: String(userData._id), // Ensure ID is a string
      roleDetails: {
        description: role.description,
        accessScope: role.accessScope,
        permissions: role.permissions,
        permissionStrings: role.permissionStrings || [],
        details: role.details || []
      }
    };
    
    return userWithPermissions;
  }

  async getAllUsers(
    filterOptions: UsersFilterOptions = {},
    paginationOptions: UsersPaginationOptions = { page: 1, limit: 10 },
    sortOptions: UsersSortOptions = { field: 'createdAt', direction: 'desc' },
    currentUser?: User,
  ): Promise<UsersResponse> {
    // Build the filter query
    const filter: any = { isDeleted: { $ne: true } };
    
    // Filter by status
    if (filterOptions.status) {
      if (filterOptions.status === 'active') {
        filter.isActive = true;
      } else if (filterOptions.status === 'inactive') {
        filter.isActive = false;
      }
      // If status is 'all', don't add a filter
    }
    // Filter by role
    if (filterOptions.role) {
      filter.role = filterOptions.role;
    }

    // Filter by campusId
    if (filterOptions.campusId) {
      try {
        const campusObjectId = new Types.ObjectId(filterOptions.campusId);
        filter.campuses = { $in: [campusObjectId] };
      } catch (_) {
        // Ignore invalid campus ID
      }
    }

    // Filter by roomId
    if (filterOptions.roomId) {
      try {
        const roomObjectId = new Types.ObjectId(filterOptions.roomId);
        filter.rooms = { $in: [roomObjectId] };
      } catch (_) {
        // Ignore invalid room ID
      }
    }

    // Search by name or email
    if (filterOptions.search) {
      const searchRegex = new RegExp(filterOptions.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Calculate pagination values
    const page = Math.max(1, paginationOptions.page);
    const limit = Math.max(1, Math.min(100, paginationOptions.limit)); // Limit between 1 and 100
    const skip = (page - 1) * limit;
    
    // Build the sort object
    const sort: any = {};
    sort[sortOptions.field] = sortOptions.direction === 'asc' ? 1 : -1;
    
    // Apply access filter based on current user
    if (currentUser) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }

    // Count total matching documents for pagination info
    const total = await this.userModel.countDocuments(filter);
    
    // Execute the query with filtering, pagination, and sorting
    const users = await this.userModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<UserDocument[]>()
      .exec();
    
    // Map the users to the expected format
    const mappedUsers = users.map(user => ({
      _id: user._id.toString(),
      avatar: user.avatar,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt
    }));
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    // Return the paginated response
    return {
      users: mappedUsers,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getDeletedUsers(
    filterOptions: UsersFilterOptions = {},
    paginationOptions: UsersPaginationOptions = { page: 1, limit: 10 },
    sortOptions: UsersSortOptions = { field: 'createdAt', direction: 'desc' },
    currentUser?: User,
  ): Promise<UsersResponse> {
    const filter: any = { isDeleted: true };

    if (filterOptions.role) {
      filter.role = filterOptions.role;
    }

    // Filter by campusId
    if (filterOptions.campusId) {
      try {
        const campusObjectId = new Types.ObjectId(filterOptions.campusId);
        filter.campuses = { $in: [campusObjectId] };
      } catch (_) {
        // Ignore invalid campus ID
      }
    }

    // Filter by roomId
    if (filterOptions.roomId) {
      try {
        const roomObjectId = new Types.ObjectId(filterOptions.roomId);
        filter.rooms = { $in: [roomObjectId] };
      } catch (_) {
        // Ignore invalid room ID
      }
    }

    if (filterOptions.search) {
      const searchRegex = new RegExp(filterOptions.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    const page = Math.max(1, paginationOptions.page);
    const limit = Math.max(1, Math.min(100, paginationOptions.limit));
    const skip = (page - 1) * limit;

    const sort: any = {};
    sort[sortOptions.field] = sortOptions.direction === 'asc' ? 1 : -1;

    // Apply access filter based on current user
    if (currentUser) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }

    const total = await this.userModel.countDocuments(filter);
    const users = await this.userModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean<UserDocument[]>()
      .exec();

    const mappedUsers = users.map(user => ({
      _id: user._id.toString(),
      avatar: user.avatar,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      users: mappedUsers,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Check if a campus already has a director assigned (other than the specified user)
   * @param campusId - The ID of the campus to check
   * @param userId - The ID of the user being assigned as director
   * @returns True if the campus already has another director, false otherwise
   */
  async campusHasAnotherDirector(campusId: string, userId: string): Promise<boolean> {
    try {
      // First check if the campus exists and has a director assigned in the campus collection
      const campus = await this.userModel.db.collection('campus').findOne({ 
        _id: new Types.ObjectId(campusId.toString()) 
      });
      
      // If campus has a director field populated and it's not the current user
      if (campus && campus.campusDirector) {
        const campusDirectorId = campus.campusDirector.toString();
        if (campusDirectorId !== userId) {
          console.log(`Campus ${campusId} already has director ${campusDirectorId} assigned (not ${userId})`);
          return true;
        }
      }
      
      // Also check if any other user with Director role has this campus assigned
      const otherDirectorWithCampus = await this.userModel.findOne({
        _id: { $ne: new Types.ObjectId(userId.toString()) }, // Not the current user
        role: UserRole.DIRECTOR,
        campuses: campusId
      });
      
      if (otherDirectorWithCampus) {
        console.log(`Campus ${campusId} is assigned to another director ${otherDirectorWithCampus._id} (not ${userId})`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if campus ${campusId} has another director:`, error);
      return false; // Default to false in case of error
    }
  }

  /**
   * Update a user by ID
   * @param userId - The ID of the user to update
   * @param updateData - The data to update the user with
   * @returns The updated user with permissions
   */
  async updateUser(userId: string, updateData: UpdateUserDto, currentUser?: User): Promise<UserWithPermissions> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!existingUser) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // If email is being updated, check if it's already in use
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.userModel.findOne({ email: updateData.email });
      if (emailExists) {
        throw new BadRequestException(`Email '${updateData.email}' is already in use`);
      }
    }

    // If role is being updated, check if it exists
    if (updateData.role) {
      const roleExists = await this.roleModel.findOne({ name: updateData.role });
      if (!roleExists) {
        throw new BadRequestException(`Role '${updateData.role}' does not exist`);
      }

      // If user is being updated to Director role and has campuses
      if (updateData.role === UserRole.DIRECTOR && updateData.campuses && updateData.campuses.length > 0) {
        // Check each campus to see if it already has a director
        for (const campusId of updateData.campuses) {
          const hasAnotherDirector = await this.campusHasAnotherDirector(campusId, userId);
          if (hasAnotherDirector) {
            throw new ConflictException('This campus is already assigned to another Director.');
          }
        }
      }

      // Update accessScope based on role if not explicitly provided
      if (!updateData.accessScope) {
        // Set appropriate accessScope based on role
        switch (updateData.role) {
          case UserRole.ADMINISTRATOR:
            updateData.accessScope = AccessScope.ALL;
            break;
          case UserRole.AREA_MANAGER:
            updateData.accessScope = AccessScope.MULTIPLE_CAMPUS;
            break;
          case UserRole.DIRECTOR:
          case UserRole.ASSISTANT_DIRECTOR:
          case UserRole.EDUCATIONAL_LEADER:
          case UserRole.ENROLMENTS:
          case UserRole.WHS_MEDICAL:
          case UserRole.CENTRE_LOGIN:
            updateData.accessScope = AccessScope.SINGLE_CAMPUS;
            break;
          case UserRole.ROOM_LOGIN:
          case UserRole.STAFF:
          case UserRole.TEACHER:
            updateData.accessScope = AccessScope.SINGLE_ROOM;
            break;
          case UserRole.PARENT:
            updateData.accessScope = AccessScope.OWN_CHILDREN;
            break;
          default:
            // Keep existing accessScope if role is not recognized
            break;
        }
      }
    }

    // Hash password if being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Update the user first
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true } // Return the updated document
    );

    // If this is a Director role and campuses are being updated
    if ((updatedUser.role === UserRole.DIRECTOR) && 
        updateData.campuses && updateData.campuses.length > 0) {
      try {
        // Since Director has SINGLE_CAMPUS access, we only need to update one campus
        const newCampusId = updateData.campuses[0]; // Get the first (and should be only) campus
        
        // First check if this campus is already assigned to another Director
        const hasAnotherDirector = await this.campusHasAnotherDirector(newCampusId, userId);
        if (hasAnotherDirector) {
          throw new ConflictException('This campus is already assigned to another Director.');
        }
        
        // If the user was previously a Director with a different campus, remove them from that campus
        if (existingUser.role === UserRole.DIRECTOR && 
            existingUser.campuses && 
            existingUser.campuses.length > 0) {
          
          // Get the old campus ID
          const oldCampusId = existingUser.campuses[0];
          
          // Only remove if the campus is different
          if (oldCampusId.toString() !== newCampusId.toString()) {
            // Remove the user as director from the old campus
            await this.userModel.db.collection('campus').updateOne(
              { 
                _id: new Types.ObjectId(oldCampusId.toString()),
                campusDirector: existingUser._id
              },
              { $unset: { campusDirector: "" } }
            );
            console.log(`Removed user ${existingUser._id} as director from old campus ${oldCampusId}`);
          }
        }
        
        // Update the new campus to set this user as the campusDirector
        await this.userModel.db.collection('campus').updateOne(
          { _id: new Types.ObjectId(newCampusId.toString()) },
          { $set: { campusDirector: updatedUser._id } }
        );
        console.log(`Updated campus ${newCampusId} to set director ${updatedUser._id}`);
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error; // Re-throw conflict exceptions
        }
        console.error('Error updating campus director:', error);
        // We don't throw here to avoid failing the user update for non-conflict errors
        // but we log the error for debugging
      }
    }

    // If user was a Director but is no longer, remove them as director from their campus
    if (existingUser.role === UserRole.DIRECTOR && updatedUser.role !== UserRole.DIRECTOR) {
      try {
        if (existingUser.campuses && existingUser.campuses.length > 0) {
          const campusId = existingUser.campuses[0]; // Get the first (and should be only) campus
          
          // Only remove if this user is the current director
          await this.userModel.db.collection('campus').updateOne(
            { 
              _id: new Types.ObjectId(campusId.toString()),
              campusDirector: updatedUser._id
            },
            { $unset: { campusDirector: "" } }
          );
          console.log(`Removed user ${updatedUser._id} as director from campus ${campusId} due to role change`);
        }
      } catch (error) {
        console.error('Error removing campus director after role change:', error);
      }
    }

    // Handle feed items for staff members when rooms are updated
    if (updatedUser.role === UserRole.STAFF) {
      try {
        const existingRooms = (existingUser.rooms || []).map((r: any) => 
          r.toString ? r.toString() : String(r)
        );
        const updatedRooms = (updatedUser.rooms || []).map((r: any) => 
          r.toString ? r.toString() : String(r)
        );
        
        // Find newly added rooms by comparing old vs new
        const newlyAddedRooms = updatedRooms.filter(
          (roomId) => !existingRooms.includes(roomId)
        );
        
        if (newlyAddedRooms.length > 0) {
          const createdById = currentUser?._id?.toString() || updatedUser._id.toString();
          
          for (const roomId of newlyAddedRooms) {
            const room = await this.userModel.db
              .collection('rooms')
              .findOne({ _id: new Types.ObjectId(roomId) });
            
            if (room) {
              const roomName = room.name || 'the room';
              const campusId = room.campus ? room.campus.toString() : (updatedUser.campuses && updatedUser.campuses.length > 0 ? updatedUser.campuses[0].toString() : null);
              const staffFullName = `${updatedUser.firstName} ${updatedUser.lastName}`.trim();
              const title = `Welcome ${staffFullName}`;
              const description = `Please meet our newest staff member at ${roomName}.`;
              
              const visibleUntil = new Date();
              visibleUntil.setDate(visibleUntil.getDate() + 1);
              
              await this.feedService.create(
                {
                  type: 'new-staff',
                  refId: updatedUser._id.toString(),
                  isForAllCampuses: false,
                  campuses: campusId ? [campusId] : [],
                  rooms: [roomId],
                  title,
                  description,
                  visibleUntil: visibleUntil.toISOString(),
                },
                createdById,
              );
            }
          }
        }
      } catch (error) {
        console.error('Error creating feed item for updated staff:', error);
      }
    }

    // Get the user with permissions
    return this.getUserById(userId);
  }


  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    await this.userModel.updateOne({ _id: userId }, { $set: { isDeleted: true, isActive: false } });
    return { message: 'User deleted successfully' };
  }

  async restoreUser(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: true });
    if (!user) {
      throw new NotFoundException(`Deleted user with ID '${userId}' not found`);
    }

    await this.userModel.updateOne({ _id: userId }, { $set: { isDeleted: false, isActive: true } });
    return { message: 'User restored successfully' };
  }

  async getNonParentUsers(
    campusId?: string,
    paginationOptions: UsersPaginationOptions = { page: 1, limit: 10 },
    sortOptions: UsersSortOptions = { field: 'createdAt', direction: 'desc' },
    currentUser?: User,
  ): Promise<UsersResponse> {
    const filter: any = {
      isDeleted: { $ne: true },
      role: { $ne: UserRole.PARENT },
    };

    if (currentUser) {
      filter._id = { $ne: new Types.ObjectId(currentUser._id.toString()) };
    }

    if (campusId) {
      try {
        const campusObjectId = new Types.ObjectId(campusId);
        filter.campuses = { $in: [campusObjectId] };
      } catch (_) {
        // Ignore invalid campus ID
      }
    }

    if (currentUser) {
      const accessFilter = buildUserAccessFilter(currentUser as any);
      if (Object.keys(accessFilter).length > 0) {
        filter.$and = filter.$and || [];
        filter.$and.push(accessFilter);
      }

      if (!campusId && currentUser.role !== UserRole.ADMINISTRATOR) {
        const campusFilter = buildStrictCampusInFilterByIds(
          currentUser.campuses as any,
          'campuses',
        );
        if (Object.keys(campusFilter).length > 0) {
          filter.$and = filter.$and || [];
          filter.$and.push(campusFilter);
        }
      }
    }

    const roleOrder: Record<string, number> = {
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

    const page = Math.max(1, paginationOptions.page);
    const limit = Math.max(1, Math.min(100, paginationOptions.limit));
    const skip = (page - 1) * limit;

    const total = await this.userModel.countDocuments(filter);

    const users = await this.userModel
      .find(filter)
      .select('_id firstName lastName email role isActive lastLogin createdAt campuses')
      .populate('campuses', 'name')
      .lean<UserDocument[]>()
      .exec();

    const sortedUsers = users.sort((a: any, b: any) => {
      const roleOrderA = roleOrder[a.role] || 999;
      const roleOrderB = roleOrder[b.role] || 999;

      if (roleOrderA !== roleOrderB) {
        return roleOrderA - roleOrderB;
      }

      const fieldA = a[sortOptions.field];
      const fieldB = b[sortOptions.field];

      if (fieldA === undefined && fieldB === undefined) return 0;
      if (fieldA === undefined) return 1;
      if (fieldB === undefined) return -1;

      if (fieldA instanceof Date && fieldB instanceof Date) {
        return sortOptions.direction === 'asc'
          ? fieldA.getTime() - fieldB.getTime()
          : fieldB.getTime() - fieldA.getTime();
      }

      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortOptions.direction === 'asc'
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }

      if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        return sortOptions.direction === 'asc' ? fieldA - fieldB : fieldB - fieldA;
      }

      return 0;
    });

    const paginatedUsers = sortedUsers.slice(skip, skip + limit);

    const mappedUsers = paginatedUsers.map((user: any) => ({
      _id: user._id.toString(),
      avatar: user.avatar,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt,
      campuses: user.campuses || [],
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      users: mappedUsers,
      total,
      page,
      limit,
      totalPages,
    };
  }

}
