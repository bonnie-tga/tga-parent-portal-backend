import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedDto } from 'src/common/dto/paginated.dto';
import { CotRoom, CotRoomStatus } from '../schemas/cot-room.schema';
import { Campus } from '../schemas/campus.schema';
import { Room } from '../schemas/room.schema';
import { User } from '../../users/schemas/user.schema';
import { CreateCotRoomDto } from '../dto/create-cot-room.dto';
import { UpdateCotRoomDto } from '../dto/update-cot-room.dto';

@Injectable()
export class CotRoomService {
  constructor(
    @InjectModel(CotRoom.name) private cotRoomModel: Model<CotRoom>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createCotRoomDto: CreateCotRoomDto): Promise<CotRoom> {
    // Validate createdBy if provided
    if (createCotRoomDto.createdBy) {
      const user = await this.userModel.findById(createCotRoomDto.createdBy).exec();
      if (!user) {
        throw new NotFoundException(`User with ID '${createCotRoomDto.createdBy}' not found`);
      }
    }
    
    // Check if campus exists
    const campus = await this.campusModel.findById(createCotRoomDto.campus).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${createCotRoomDto.campus}' not found`);
    }

    // Check if room exists if provided
    if (createCotRoomDto.room) {
      const room = await this.roomModel.findById(createCotRoomDto.room).exec();
      if (!room) {
        throw new NotFoundException(`Room with ID '${createCotRoomDto.room}' not found`);
      }
    }

    // Check if cot room with same name already exists in the campus
    const existingCotRoom = await this.cotRoomModel.findOne({
      name: createCotRoomDto.name,
      campus: new Types.ObjectId(createCotRoomDto.campus),
      ...(createCotRoomDto.room && { room: new Types.ObjectId(createCotRoomDto.room) }),
    });
    
    if (existingCotRoom) {
      throw new ConflictException(`Cot room with name '${createCotRoomDto.name}' already exists in this campus/room`);
    }

    // Create the cot room
    const newCotRoom = new this.cotRoomModel({
      ...createCotRoomDto,
      createdBy: createCotRoomDto.createdBy ? new Types.ObjectId(createCotRoomDto.createdBy) : undefined
    });
    
    return newCotRoom.save();
  }

  async findAll(): Promise<CotRoom[]> {
    return this.cotRoomModel.find()
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
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
  }): Promise<PaginatedDto<CotRoom & { campusName?: string, roomName?: string }>> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      campusId,
      campusName,
      roomId,
      roomName,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = filters;
    
    const skip = (page - 1) * limit;
    
    // Build filter query
    const query: any = {};
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by campusId
    if (campusId) {
      query.campus = campusId;
    }
    
    // Filter by campusName (requires aggregation)
    if (campusName) {
      const campuses = await this.campusModel.find({ 
        name: { $regex: campusName, $options: 'i' } 
      }).exec();
      
      if (campuses.length > 0) {
        const campusIds = campuses.map(campus => campus._id);
        query.campus = { $in: campusIds };
      }
    }
    
    // Filter by roomId
    if (roomId) {
      query.room = roomId;
    }
    
    // Filter by roomName (requires aggregation)
    if (roomName) {
      const rooms = await this.roomModel.find({ 
        name: { $regex: roomName, $options: 'i' } 
      }).exec();
      
      if (rooms.length > 0) {
        const roomIds = rooms.map(room => room._id);
        query.room = { $in: roomIds };
      }
    }
    
    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    // Create sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const [cotRooms, totalCount] = await Promise.all([
      this.cotRoomModel.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate('campus')
        .populate('room')
        .populate('createdBy', 'firstName lastName')
        .exec(),
      this.cotRoomModel.countDocuments(query)
    ]);
    
    // Define interface for cot room with campus and room names
    interface CotRoomWithNames extends CotRoom {
      campusName?: string;
      roomName?: string;
    }
    
    // Transform data to include campus and room names
    const transformedCotRooms = cotRooms.map(cotRoom => {
      const cotRoomObj = cotRoom.toObject() as CotRoomWithNames;
      
      if (cotRoomObj.campus && typeof cotRoomObj.campus === 'object') {
        cotRoomObj.campusName = (cotRoomObj.campus as any).name;
      }
      
      if (cotRoomObj.room && typeof cotRoomObj.room === 'object') {
        cotRoomObj.roomName = (cotRoomObj.room as any).name;
      }
      
      return cotRoomObj;
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    // Return paginated result
    return {
      data: transformedCotRooms,
      meta: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages
      }
    };
  }

  async findAllActive(): Promise<CotRoom[]> {
    return this.cotRoomModel.find({ isActive: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findByCampus(campusId: string): Promise<CotRoom[]> {
    return this.cotRoomModel.find({ campus: campusId, isActive: true })
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findByRoom(roomId: string): Promise<CotRoom[]> {
    return this.cotRoomModel.find({ room: roomId, isActive: true })
      .populate('campus', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string): Promise<CotRoom> {
    const cotRoom = await this.cotRoomModel.findById(id)
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
      
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }
    
    return cotRoom;
  }

  async update(id: string, updateCotRoomDto: UpdateCotRoomDto): Promise<CotRoom> {
    // Validate createdBy if provided
    if (updateCotRoomDto.createdBy) {
      const user = await this.userModel.findById(updateCotRoomDto.createdBy).exec();
      if (!user) {
        throw new NotFoundException(`User with ID '${updateCotRoomDto.createdBy}' not found`);
      }
    }
    
    // Check if cot room exists
    const cotRoom = await this.cotRoomModel.findById(id).exec();
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }

    // If changing campus, check if the new campus exists
    if (updateCotRoomDto.campus && updateCotRoomDto.campus !== cotRoom.campus.toString()) {
      const newCampus = await this.campusModel.findById(updateCotRoomDto.campus).exec();
      if (!newCampus) {
        throw new NotFoundException(`Campus with ID '${updateCotRoomDto.campus}' not found`);
      }
    }

    // If changing room, check if the new room exists
    if (updateCotRoomDto.room && updateCotRoomDto.room !== cotRoom.room?.toString()) {
      const newRoom = await this.roomModel.findById(updateCotRoomDto.room).exec();
      if (!newRoom) {
        throw new NotFoundException(`Room with ID '${updateCotRoomDto.room}' not found`);
      }
    }

    // Check if trying to update name and if it already exists in the campus/room
    if (updateCotRoomDto.name && updateCotRoomDto.name !== cotRoom.name) {
      const campusId = updateCotRoomDto.campus || cotRoom.campus;
      const roomId = updateCotRoomDto.room || cotRoom.room;
      
      const existingCotRoom = await this.cotRoomModel.findOne({
        name: updateCotRoomDto.name,
        campus: new Types.ObjectId(campusId.toString()),
        ...(roomId && { room: new Types.ObjectId(roomId.toString()) }),
        _id: { $ne: id },
      });
      
      if (existingCotRoom) {
        throw new ConflictException(`Cot room with name '${updateCotRoomDto.name}' already exists in this campus/room`);
      }
    }

    // Prepare update data
    const updateData: any = { ...updateCotRoomDto };
    if (updateCotRoomDto.createdBy) {
      updateData.createdBy = new Types.ObjectId(updateCotRoomDto.createdBy);
    }

    const updatedCotRoom = await this.cotRoomModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('campus', 'name')
      .populate('room', 'name')
      .populate('createdBy', 'firstName lastName')
      .exec();
      
    return updatedCotRoom;
  }

  async remove(id: string): Promise<void> {
    const cotRoom = await this.cotRoomModel.findById(id).exec();
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }

    await this.cotRoomModel.deleteOne({ _id: id }).exec();
  }

  async updateStatus(id: string, status: CotRoomStatus): Promise<CotRoom> {
    const cotRoom = await this.cotRoomModel.findById(id).exec();
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }

    cotRoom.status = status;
    return cotRoom.save();
  }

  async deactivate(id: string): Promise<CotRoom> {
    const cotRoom = await this.cotRoomModel.findById(id).exec();
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }

    cotRoom.isActive = false;
    return cotRoom.save();
  }

  async activate(id: string): Promise<CotRoom> {
    const cotRoom = await this.cotRoomModel.findById(id).exec();
    if (!cotRoom) {
      throw new NotFoundException(`Cot room with ID '${id}' not found`);
    }

    cotRoom.isActive = true;
    return cotRoom.save();
  }
}
