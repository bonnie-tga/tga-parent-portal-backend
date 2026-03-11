import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { buildUserAccessFilter, isAdministrator } from 'src/common/access/access-filter.util';
import { UserRole } from '../../users/schemas/user.schema';
import { Campus } from '../../campus/schemas/campus.schema';
import { Room } from '../../campus/schemas/room.schema';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import bcrypt from 'bcrypt';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}

  /**
   * Create a new teacher
   */
  async create(createTeacherDto: CreateTeacherDto): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.userModel.findOne({ email: createTeacherDto.email });
    if (existingUser) {
      throw new ConflictException(`User with email '${createTeacherDto.email}' already exists`);
    }

    // Check if campus exists if campusId is provided
    if (createTeacherDto.campusId) {
      const campus = await this.campusModel.findById(createTeacherDto.campusId);
      if (!campus) {
        throw new NotFoundException(`Campus with ID '${createTeacherDto.campusId}' not found`);
      }
    }

    // Check if room exists if roomId is provided
    if (createTeacherDto.roomId) {
      const room = await this.roomModel.findById(createTeacherDto.roomId);
      if (!room) {
        throw new NotFoundException(`Room with ID '${createTeacherDto.roomId}' not found`);
      }
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createTeacherDto.password, salt);

    // Create new user with TEACHER role
    const newTeacher = new this.userModel({
      firstName: createTeacherDto.firstName,
      lastName: createTeacherDto.lastName,
      email: createTeacherDto.email,
      password: hashedPassword,
      role: UserRole.TEACHER,
      isActive: true,
      lastLogin: null,
    });

    // If campusId is provided, add it to the teacher's campuses array
    if (createTeacherDto.campusId) {
      newTeacher.campuses = [createTeacherDto.campusId as any];
    }

    // If roomId is provided, add it to the teacher's rooms array
    if (createTeacherDto.roomId) {
      newTeacher.rooms = [createTeacherDto.roomId as any];
    }

    return newTeacher.save();
  }

  /**
   * Find all teachers
   */
  async findAll(currentUser?: User): Promise<User[]> {
    const filter: any = { role: UserRole.TEACHER };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }
    return this.userModel.find(filter)
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();
  }

  /**
   * Find all active teachers
   */
  async findAllActive(currentUser?: User): Promise<User[]> {
    const filter: any = { role: UserRole.TEACHER, isActive: true };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }
    return this.userModel.find(filter)
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();
  }

  /**
   * Find a teacher by ID
   */
  async findOne(id: string, currentUser?: User): Promise<User> {
    const base: any = { _id: id, role: UserRole.TEACHER };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        base.$and = base.$and || [];
        base.$and.push(access);
      }
    }
    const teacher = await this.userModel.findOne(base)
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${id}' not found`);
    }
    
    return teacher;
  }

  /**
   * Find a teacher by email
   */
  async findByEmail(email: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      email,
      role: UserRole.TEACHER 
    })
      .populate('campuses', 'name')
      .populate('rooms', 'name')
      .exec();
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with email '${email}' not found`);
    }
    
    return teacher;
  }

  /**
   * Find teachers by campus ID
   */
  async findByCampus(campusId: string, currentUser?: User): Promise<User[]> {
    // First check if campus exists
    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Find teachers who have this campus in their campuses array
    const filter: any = { role: UserRole.TEACHER, campuses: { $in: [campusId] } };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }
    return this.userModel.find(filter)
      .populate('rooms', 'name')
      .exec();
  }

  /**
   * Find teachers by room ID
   */
  async findByRoom(roomId: string, currentUser?: User): Promise<User[]> {
    // First check if room exists
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID '${roomId}' not found`);
    }

    // Find teachers who have this room in their rooms array
    const filter: any = { role: UserRole.TEACHER, rooms: { $in: [roomId] } };
    if (currentUser && !isAdministrator(currentUser)) {
      const access = buildUserAccessFilter(currentUser as any);
      if (Object.keys(access).length) {
        filter.$and = filter.$and || [];
        filter.$and.push(access);
      }
    }
    return this.userModel.find(filter)
      .populate('campuses', 'name')
      .exec();
  }

  /**
   * Update a teacher
   */
  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<User> {
    // Check if teacher exists
    const teacher = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${id}' not found`);
    }

    // Check if email is unique if it's being updated
    if (updateTeacherDto.email && updateTeacherDto.email !== teacher.email) {
      const existingUser = await this.userModel.findOne({ email: updateTeacherDto.email });
      if (existingUser) {
        throw new ConflictException(`User with email '${updateTeacherDto.email}' already exists`);
      }
    }

    // Check if campus exists if campusId is provided
    if (updateTeacherDto.campusId) {
      const campus = await this.campusModel.findById(updateTeacherDto.campusId);
      if (!campus) {
        throw new NotFoundException(`Campus with ID '${updateTeacherDto.campusId}' not found`);
      }
    }

    // Check if room exists if roomId is provided
    if (updateTeacherDto.roomId) {
      const room = await this.roomModel.findById(updateTeacherDto.roomId);
      if (!room) {
        throw new NotFoundException(`Room with ID '${updateTeacherDto.roomId}' not found`);
      }
    }

    // Update fields
    if (updateTeacherDto.firstName) teacher.firstName = updateTeacherDto.firstName;
    if (updateTeacherDto.lastName) teacher.lastName = updateTeacherDto.lastName;
    if (updateTeacherDto.email) teacher.email = updateTeacherDto.email;
    if (updateTeacherDto.isActive !== undefined) teacher.isActive = updateTeacherDto.isActive;
    
    // Hash and update password if provided
    if (updateTeacherDto.password) {
      const salt = await bcrypt.genSalt();
      teacher.password = await bcrypt.hash(updateTeacherDto.password, salt);
    }

    // Update campus if provided
    if (updateTeacherDto.campusId) {
      // Check if campus is already in the array
      if (!teacher.campuses.some(campus => campus.toString() === updateTeacherDto.campusId)) {
        teacher.campuses.push(updateTeacherDto.campusId as any);
      }
    }

    // Update room if provided
    if (updateTeacherDto.roomId) {
      // Check if room is already in the array
      if (!teacher.rooms.some(room => room.toString() === updateTeacherDto.roomId)) {
        teacher.rooms.push(updateTeacherDto.roomId as any);
      }
    }

    return teacher.save();
  }

  /**
   * Remove a teacher
   */
  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ 
      _id: id,
      role: UserRole.TEACHER 
    }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Teacher with ID '${id}' not found`);
    }
  }

  /**
   * Deactivate a teacher
   */
  async deactivate(id: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${id}' not found`);
    }

    teacher.isActive = false;
    return teacher.save();
  }

  /**
   * Activate a teacher
   */
  async activate(id: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${id}' not found`);
    }

    teacher.isActive = true;
    return teacher.save();
  }

  /**
   * Assign a campus to a teacher
   */
  async assignCampus(teacherId: string, campusId: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: teacherId,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${teacherId}' not found`);
    }

    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Check if campus is already assigned to this teacher
    if (teacher.campuses.some(c => c.toString() === campusId)) {
      throw new BadRequestException(`Campus with ID '${campusId}' is already assigned to this teacher`);
    }

    // Add campus to teacher's campuses
    teacher.campuses.push(campusId as any);
    
    return teacher.save();
  }

  /**
   * Remove a campus from a teacher
   */
  async removeCampus(teacherId: string, campusId: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: teacherId,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${teacherId}' not found`);
    }

    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Check if campus is assigned to this teacher
    if (!teacher.campuses.some(c => c.toString() === campusId)) {
      throw new BadRequestException(`Campus with ID '${campusId}' is not assigned to this teacher`);
    }

    // Remove campus from teacher's campuses
    teacher.campuses = teacher.campuses.filter(c => c.toString() !== campusId);
    
    return teacher.save();
  }

  /**
   * Assign a room to a teacher
   */
  async assignRoom(teacherId: string, roomId: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: teacherId,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${teacherId}' not found`);
    }

    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID '${roomId}' not found`);
    }

    // Check if room is already assigned to this teacher
    if (teacher.rooms.some(r => r.toString() === roomId)) {
      throw new BadRequestException(`Room with ID '${roomId}' is already assigned to this teacher`);
    }

    // Add room to teacher's rooms
    teacher.rooms.push(roomId as any);
    
    return teacher.save();
  }

  /**
   * Remove a room from a teacher
   */
  async removeRoom(teacherId: string, roomId: string): Promise<User> {
    const teacher = await this.userModel.findOne({ 
      _id: teacherId,
      role: UserRole.TEACHER 
    });
    
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID '${teacherId}' not found`);
    }

    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID '${roomId}' not found`);
    }

    // Check if room is assigned to this teacher
    if (!teacher.rooms.some(r => r.toString() === roomId)) {
      throw new BadRequestException(`Room with ID '${roomId}' is not assigned to this teacher`);
    }

    // Remove room from teacher's rooms
    teacher.rooms = teacher.rooms.filter(r => r.toString() !== roomId);
    
    return teacher.save();
  }
}
