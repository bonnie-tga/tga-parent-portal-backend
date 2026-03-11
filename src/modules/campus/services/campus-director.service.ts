import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { UserRole } from '../../users/schemas/user.schema';
import { Campus } from '../schemas/campus.schema';
import bcrypt from 'bcrypt';

@Injectable()
export class CampusDirectorService {
  private readonly logger = new Logger(CampusDirectorService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Campus.name) private campusModel: Model<Campus>,
  ) {}

  /**
   * Create a new campus director
   */
  async create(createDirectorDto: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.userModel.findOne({ email: createDirectorDto.email });
    if (existingUser) {
      throw new ConflictException(`User with email '${createDirectorDto.email}' already exists`);
    }


    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createDirectorDto.password, salt);

    // Create new user with DIRECTOR role
    const newDirector = new this.userModel({
      firstName: createDirectorDto.firstName,
      lastName: createDirectorDto.lastName,
      email: createDirectorDto.email,
      password: hashedPassword,
      role: UserRole.DIRECTOR,
      isActive: true,
      lastLogin: null,
    });

    // Initialize empty campuses array
    newDirector.campuses = [];

    const savedDirector = await newDirector.save();


    return savedDirector;
  }

  /**
   * Find all campus directors
   */
  async findAll(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.DIRECTOR }).exec();
  }

  /**
   * Find all active campus directors
   */
  async findAllActive(): Promise<User[]> {
    return this.userModel.find({ 
      role: UserRole.DIRECTOR,
      isActive: true 
    }).exec();
  }

  /**
   * Find a campus director by ID
   */
  async findOne(id: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.DIRECTOR 
    }).exec();
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${id}' not found`);
    }
    
    return director;
  }

  /**
   * Find a campus director by email
   */
  async findByEmail(email: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      email,
      role: UserRole.DIRECTOR 
    }).exec();
    
    if (!director) {
      throw new NotFoundException(`Campus director with email '${email}' not found`);
    }
    
    return director;
  }

  /**
   * Find campus directors by campus ID
   */
  async findByCampus(campusId: string): Promise<User[]> {
    // First check if campus exists
    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Find directors who have this campus in their campuses array
    return this.userModel.find({ 
      role: UserRole.DIRECTOR,
      campuses: { $in: [new Types.ObjectId(campusId)] }
    }).exec();
  }

  /**
   * Update a campus director
   */
  async update(id: string, updateDirectorDto: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    isActive?: boolean;
  }): Promise<User> {
    // Check if director exists
    const director = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.DIRECTOR 
    });
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${id}' not found`);
    }

    // Check if email is unique if it's being updated
    if (updateDirectorDto.email && updateDirectorDto.email !== director.email) {
      const existingUser = await this.userModel.findOne({ email: updateDirectorDto.email });
      if (existingUser) {
        throw new ConflictException(`User with email '${updateDirectorDto.email}' already exists`);
      }
    }


    // Update fields
    if (updateDirectorDto.firstName) director.firstName = updateDirectorDto.firstName;
    if (updateDirectorDto.lastName) director.lastName = updateDirectorDto.lastName;
    if (updateDirectorDto.email) director.email = updateDirectorDto.email;
    if (updateDirectorDto.isActive !== undefined) director.isActive = updateDirectorDto.isActive;
    
    // Hash and update password if provided
    if (updateDirectorDto.password) {
      const salt = await bcrypt.genSalt();
      director.password = await bcrypt.hash(updateDirectorDto.password, salt);
    }


    return director.save();
  }

  /**
   * Remove a campus director
   */
  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ 
      _id: id,
      role: UserRole.DIRECTOR 
    }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Campus director with ID '${id}' not found`);
    }

    // Update any campuses that had this director
    await this.campusModel.updateMany(
      { campusDirector: id as any },
      { $unset: { campusDirector: "" } }
    );
  }

  /**
   * Deactivate a campus director
   */
  async deactivate(id: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.DIRECTOR 
    });
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${id}' not found`);
    }

    director.isActive = false;
    return director.save();
  }

  /**
   * Activate a campus director
   */
  async activate(id: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      _id: id,
      role: UserRole.DIRECTOR 
    });
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${id}' not found`);
    }

    director.isActive = true;
    return director.save();
  }

  /**
   * Assign a campus to a director
   */
  async assignCampus(directorId: string, campusId: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      _id: directorId,
      role: UserRole.DIRECTOR 
    });
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${directorId}' not found`);
    }

    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Check if campus is already assigned to this director
    if (director.campuses.some(c => c.toString() === campusId)) {
      throw new BadRequestException(`Campus with ID '${campusId}' is already assigned to this director`);
    }

    // Add campus to director's campuses
    director.campuses.push(campusId as any);
    
    // Update campus with director ID
    campus.campusDirector = directorId as any;
    await campus.save();

    return director.save();
  }

  /**
   * Remove a campus from a director
   */
  async removeCampus(directorId: string, campusId: string): Promise<User> {
    const director = await this.userModel.findOne({ 
      _id: directorId,
      role: UserRole.DIRECTOR 
    });
    
    if (!director) {
      throw new NotFoundException(`Campus director with ID '${directorId}' not found`);
    }

    const campus = await this.campusModel.findById(campusId);
    if (!campus) {
      throw new NotFoundException(`Campus with ID '${campusId}' not found`);
    }

    // Check if campus is assigned to this director
    if (!director.campuses.some(c => c.toString() === campusId)) {
      throw new BadRequestException(`Campus with ID '${campusId}' is not assigned to this director`);
    }

    // Remove campus from director's campuses
    director.campuses = director.campuses.filter(c => c.toString() !== campusId);
    
    // Remove director from campus
    if (campus.campusDirector && campus.campusDirector.toString() === directorId) {
      campus.campusDirector = undefined;
      await campus.save();
    }

    return director.save();
  }
}