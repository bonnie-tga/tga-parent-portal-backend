import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campus, CampusStatus } from '../schemas/campus.schema';
import { CreateCampusDto } from '../dto/create-campus.dto';
import { UpdateCampusDto } from '../dto/update-campus.dto';
import { PaginatedResultDto } from '../dto/paginated-result.dto';
import { User, UserRole } from 'src/modules/users/schemas/user.schema';
import { buildCampusFilter } from 'src/common/access/access-filter.util';

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: CampusStatus | CampusStatus[];
  campusIds?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CampusService {
  constructor(
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
  ) {}

  async create(createCampusDto: CreateCampusDto): Promise<Campus> {
    // Check if campus with same name already exists
    const existingCampus = await this.campusModel.findOne({ name: createCampusDto.name });
    if (existingCampus) {
      throw new ConflictException(`Campus with name '${createCampusDto.name}' already exists`);
    }

    // If a campus director is specified, check if they're already assigned to another campus
    if (createCampusDto.campusDirector) {
      // Find any campus that has this director assigned
      const existingDirectorCampus = await this.campusModel.findOne({
        campusDirector: createCampusDto.campusDirector
      });

      if (existingDirectorCampus) {
        throw new ConflictException('This campus director is already assigned to another campus.');
      }
    }

    const newCampus = new this.campusModel(createCampusDto);
    return newCampus.save();
  }

  // Note: room-level special-case helper removed in favor of unified access filters

  async findAll(options?: FindAllOptions, user?: User): Promise<PaginatedResultDto<Campus>> {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status,
      campusIds,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query: any = {};
    
    // Add search condition if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter if provided
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }

    // Filter by specific campusIds when provided
    if (campusIds && Array.isArray(campusIds) && campusIds.length > 0) {
      try {
        const campusObjectIds = campusIds.map((id) => new Types.ObjectId(id));
        query._id = { $in: campusObjectIds };
      } catch (_) {
        // ignore invalid ids
      }
    }
    
    // Apply access filter based on user's role/scope
    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }
    
    // Count total documents matching the query
    const total = await this.campusModel.countDocuments(query).exec();
    
    // Execute query with pagination and sorting
    const data = await this.campusModel.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate('campusDirector', 'firstName lastName email')
      .exec();
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findAllActive(options?: FindAllOptions, user?: User): Promise<PaginatedResultDto<Campus>> {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      campusIds,
    } = options || {};

    const skip = (page - 1) * limit;

    let query: any = { status: CampusStatus.PUBLISH };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (campusIds && Array.isArray(campusIds) && campusIds.length > 0) {
      try {
        const campusObjectIds = campusIds.map((id) => new Types.ObjectId(id));
        query._id = { $in: campusObjectIds };
      } catch (_) {}
    }

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const total = await this.campusModel.countDocuments(query).exec();
    const data = await this.campusModel
      .find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate('campusDirector', 'firstName lastName email')
      .exec();

    const totalPages = Math.ceil(total / limit);
    return { data, total, page, limit, totalPages };
  }

  async findAllForParent(): Promise<Campus[]> {
    const query: any = {
      status: CampusStatus.PUBLISH,
      isActive: true,
    };
    return this.campusModel
      .find(query)
      .sort({ name: 1 })
      .populate('campusDirector', 'firstName lastName email')
      .exec();
  }
  
  async findByStatus(status: CampusStatus, options?: FindAllOptions, user?: any): Promise<PaginatedResultDto<Campus>> {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      campusIds,
    } = options || {};

    const skip = (page - 1) * limit;

    let query: any = { status };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (campusIds && Array.isArray(campusIds) && campusIds.length > 0) {
      try {
        const campusObjectIds = campusIds.map((id) => new Types.ObjectId(id));
        query._id = { $in: campusObjectIds };
      } catch (_) {}
    }

    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const total = await this.campusModel.countDocuments(query).exec();
    const data = await this.campusModel
      .find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate('campusDirector', 'firstName lastName email')
      .exec();

    const totalPages = Math.ceil(total / limit);
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string, user?: any): Promise<Campus> {
    let query: any = { _id: id };

    // Apply access filter based on user's role/scope
    if (user) {
      const access = buildCampusFilter(user as any);
      query = { ...query, ...access };
    }

    const campus = await this.campusModel
      .findOne(query)
      .populate('campusDirector', 'firstName lastName email')
      .exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }

    return campus;
  }

  /**
   * Check if a campus is already assigned to another Director
   * @param campusId - The ID of the campus to check
   * @param directorId - The ID of the director being assigned
   * @returns True if the campus is already assigned to another director, false otherwise
   */
  async isCampusAssignedToAnotherDirector(campusId: string, directorId: string): Promise<boolean> {
    try {
      // First check if the campus has a director assigned in the campus collection
      const campus = await this.campusModel.findById(campusId).exec();
      
      // If campus has a director field populated and it's not the current director
      if (campus && campus.campusDirector) {
        const campusDirectorId = campus.campusDirector.toString();
        if (campusDirectorId !== directorId) {
          console.log(`Campus ${campusId} already has director ${campusDirectorId} assigned (not ${directorId})`);
          return true;
        }
      }
      
      // Also check if any other user with Director role has this campus assigned
      const userModel = this.campusModel.db.model('User');
      const otherDirectorWithCampus = await userModel.findOne({
        _id: { $ne: new Types.ObjectId(directorId.toString()) }, // Not the current director
        role: 'director',
        campuses: campusId
      });
      
      if (otherDirectorWithCampus) {
        console.log(`Campus ${campusId} is assigned to another director ${otherDirectorWithCampus._id} (not ${directorId})`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if campus ${campusId} is assigned to another director:`, error);
      return false; // Default to false in case of error
    }
  }

  async update(id: string, updateCampusDto: UpdateCampusDto): Promise<Campus> {
    // Check if campus exists
    const campus = await this.campusModel.findById(id).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }

    // Check if trying to update name and if it already exists
    if (updateCampusDto.name && updateCampusDto.name !== campus.name) {
      const existingCampus = await this.campusModel.findOne({ name: updateCampusDto.name });
      if (existingCampus) {
        throw new ConflictException(`Campus with name '${updateCampusDto.name}' already exists`);
      }
    }

    // Check if trying to assign a campus director
    if (updateCampusDto.campusDirector) {
      // Check if this campus is already assigned to another director
      const isAssigned = await this.isCampusAssignedToAnotherDirector(
        id, 
        updateCampusDto.campusDirector
      );
      
      if (isAssigned) {
        throw new ConflictException('This campus is already assigned to another Director.');
      }
    }

    const updatedCampus = await this.campusModel
      .findByIdAndUpdate(id, updateCampusDto, { new: true })
      .exec();
      
    return updatedCampus;
  }
  
  async updateStatus(id: string, status: CampusStatus): Promise<Campus> {
    const campus = await this.campusModel.findById(id).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }
    
    campus.status = status;
    return campus.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.campusModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }
  }

  async deactivate(id: string): Promise<Campus> {
    const campus = await this.campusModel.findById(id).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }

    campus.isActive = false;
    return campus.save();
  }

  async activate(id: string): Promise<Campus> {
    const campus = await this.campusModel.findById(id).exec();
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${id}' not found`);
    }

    campus.isActive = true;
    return campus.save();
  }
}
