import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room } from '../schemas/room.schema';
import { Campus } from '../schemas/campus.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { buildRoomFilter } from 'src/common/access/access-filter.util';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    // Validate createdBy if provided
    if (createRoomDto.createdBy) {
      const user = await this.userModel.findById(createRoomDto.createdBy).exec();
      if (!user) {
        throw new NotFoundException(`User with ID '${createRoomDto.createdBy}' not found`);
      }
    }
    // Check if campus exists
    const campus = await this.campusModel.findById(createRoomDto.campus).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${createRoomDto.campus}' not found`);
    }

    // Check if room with same name already exists in the campus
    const existingRoom = await this.roomModel.findOne({
      name: createRoomDto.name,
      campus: new Types.ObjectId(createRoomDto.campus),
    });
    
    if (existingRoom) {
      throw new ConflictException(`Room with name '${createRoomDto.name}' already exists in this campus`);
    }

    // Create the room
    const newRoom = new this.roomModel({
      ...createRoomDto,
      createdBy: createRoomDto.createdBy ? new Types.ObjectId(createRoomDto.createdBy) : undefined
    });
    const savedRoom = await newRoom.save();

    // Add room to campus
    await this.campusModel.findByIdAndUpdate(
      createRoomDto.campus,
      { $push: { rooms: savedRoom._id } }
    );

    return savedRoom;
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find()
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }
  
  async findAllWithFilters(filters: {
    page: number;
    limit: number;
    search?: string;
    campusId?: string;
    campusIds?: string[];
    roomIds?: string[];
    campusName?: string;
    category?: string;
    type?: string;
    status?: string | string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, user?: User): Promise<PaginatedDto<Room & { campusName?: string }>> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      campusId,
      campusName,
      category,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = filters;
    
    const skip = (page - 1) * limit;
    
    // Build filter query
    let query: any = {};
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by campusId
    if (campusId) {
      query.campus = campusId;
    }
    
    // Filter by multiple campusIds
    if (filters.campusIds && Array.isArray(filters.campusIds) && filters.campusIds.length > 0) {
      try {
        const campusObjectIds = filters.campusIds.map((id) => new Types.ObjectId(id));
        query.campus = { $in: campusObjectIds };
      } catch (_) {
        // ignore invalid ids, resulting in empty $in will naturally return no results
      }
    }
    
    // Filter by specific roomIds (for single-room users)
    if (filters.roomIds && Array.isArray(filters.roomIds) && filters.roomIds.length > 0) {
      try {
        const roomObjectIds = filters.roomIds.map((id) => new Types.ObjectId(id));
        query._id = { $in: roomObjectIds };
      } catch (_) {
        // ignore invalid ids
      }
    }
    
    // Filter by campusName (requires aggregation)
    let campusFilter = null;
    if (campusName) {
      const campuses = await this.campusModel.find({ 
        name: { $regex: campusName, $options: 'i' } 
      }).exec();
      
      if (campuses.length > 0) {
        const campusIds = campuses.map(campus => campus._id);
        query.campus = { $in: campusIds };
      }
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    // Apply access filter based on user's role/scope
    if (user) {
      const access = buildRoomFilter(user as any);
      query = { ...query, ...access };
    }
    
    // Create sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const [rooms, totalCount] = await Promise.all([
      this.roomModel.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('campus')
        .populate('createdBy', 'firstName lastName')
        .exec(),
      this.roomModel.countDocuments(query)
    ]);
    
    // Define interface for room with campus name
    interface RoomWithCampusName extends Room {
      campusName?: string;
    }
    
    // Transform data to include campus name
    const transformedRooms = rooms.map(room => {
      const roomObj = room.toObject() as RoomWithCampusName;
      if (roomObj.campus && typeof roomObj.campus === 'object') {
        // Access the name property from the populated campus object
        // TypeScript needs to know that campus is now a populated object with a name property
        roomObj.campusName = (roomObj.campus as any).name;
      }
      return roomObj;
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    // Return paginated result
    return {
      data: transformedRooms,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages
      }
    };
  }

  async findAllActive(user?: User): Promise<Room[]> {
    let query: any = { isActive: true };
    if (user) {
      const access = buildRoomFilter(user as any);
      query = { ...query, ...access };
    }
    return this.roomModel.find(query)
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findByCampus(campusId: string, user?: User): Promise<Room[]> {
    let query: any = { campus: campusId, isActive: true };
    if (user) {
      const access = buildRoomFilter(user as any);
      query = { ...query, ...access };
    }
    return this.roomModel.find(query)
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findByMultipleCampuses(campusIds: string[], user?: User): Promise<Room[]> {
    let query: any = { campus: { $in: campusIds }, isActive: true };
    if (user) {
      const access = buildRoomFilter(user as any);
      query = { ...query, ...access };
    }
    return this.roomModel.find(query)
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string, user?: User): Promise<Room> {
    let query: any = { _id: id };

    // Apply access filter based on user's role/scope
    if (user) {
      const access = buildRoomFilter(user as any);
      query = { ...query, ...access };
    }

    const room = await this.roomModel.findOne(query)
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    // Validate createdBy if provided
    if (updateRoomDto.createdBy) {
      const user = await this.userModel.findById(updateRoomDto.createdBy).exec();
      if (!user) {
        throw new NotFoundException(`User with ID '${updateRoomDto.createdBy}' not found`);
      }
    }
    // Check if room exists
    const room = await this.roomModel.findById(id).exec();
    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    // If changing campus, check if the new campus exists
    if (updateRoomDto.campus && updateRoomDto.campus !== room.campus.toString()) {
      const newCampus = await this.campusModel.findById(updateRoomDto.campus).exec();
      if (!newCampus) {
        throw new NotFoundException(`Campus with ID '${updateRoomDto.campus}' not found`);
      }

      // Remove room from old campus
      await this.campusModel.findByIdAndUpdate(
        room.campus,
        { $pull: { rooms: room._id } }
      );

      // Add room to new campus
      await this.campusModel.findByIdAndUpdate(
        updateRoomDto.campus,
        { $push: { rooms: room._id } }
      );
    }

    // Check if trying to update name and if it already exists in the campus
    if (updateRoomDto.name && updateRoomDto.name !== room.name) {
      const campusId = updateRoomDto.campus || room.campus;
      const existingRoom = await this.roomModel.findOne({
        name: updateRoomDto.name,
        campus: new Types.ObjectId(campusId.toString()),
        _id: { $ne: id },
      });
      
      if (existingRoom) {
        throw new ConflictException(`Room with name '${updateRoomDto.name}' already exists in this campus`);
      }
    }

    // Prepare update data
    const updateData: any = { ...updateRoomDto };
    if (updateRoomDto.createdBy) {
      updateData.createdBy = new Types.ObjectId(updateRoomDto.createdBy);
    }

    const updatedRoom = await this.roomModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
      
    return updatedRoom;
  }

  async remove(id: string): Promise<void> {
    const room = await this.roomModel.findById(id).exec();
    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    // Remove room from campus
    await this.campusModel.findByIdAndUpdate(
      room.campus,
      { $pull: { rooms: room._id } }
    );

    // Delete the room
    await this.roomModel.deleteOne({ _id: id }).exec();
  }

  async deactivate(id: string): Promise<Room> {
    const room = await this.roomModel.findById(id).exec();
    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    room.isActive = false;
    return room.save();
  }

  async activate(id: string): Promise<Room> {
    const room = await this.roomModel.findById(id).exec();
    if (!room) {
      throw new NotFoundException(`Room with ID '${id}' not found`);
    }

    room.isActive = true;
    return room.save();
  }
}
