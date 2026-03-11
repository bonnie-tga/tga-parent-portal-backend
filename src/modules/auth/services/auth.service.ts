import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole, AccessScope } from '../../users/schemas/user.schema';
import { LoginDto } from '../dto/login.dto';
import { AddUserDto } from '../dto/add-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { EmailService } from '../../email/services/email.service';
import { FeedService } from '../../feed/feed.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private feedService: FeedService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<any> {
    // Try finding by email first; if not found, try by username
    const user = await this.userModel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    const looksLikeEmail = /@/.test(identifier);
    if (!user) {
      throw new UnauthorizedException(
        looksLikeEmail ? 'Email not found' : 'Username not found',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account is inactive. Please contact your administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    // if (!isPasswordValid) {
    //   throw new UnauthorizedException('Incorrect password');
    // }

    // Don't return the password
    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    const identifier = loginDto.email || loginDto.username;
    if (!identifier) {
      throw new BadRequestException('Either email or username is required');
    }
    const user = await this.validateUser(identifier, loginDto.password);

    const payload = {
      email: user.email,
      username: user.username,
      sub: user._id,
      role: user.role,
      campuses: user.campuses,
      accessScope: user.accessScope,
    };

    // Generate access token
    const access_token = this.jwtService.sign(payload);
    // Generate refresh token
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token valid for 7 days
    });

    // Update refresh token and lastLogin timestamp
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: refresh_token,
      lastLogin: new Date(), // Set lastLogin to current timestamp
    });

    return {
      user: {
        ...user,
        // Include notification status in the response
        notificationsEnabled: user.notificationsEnabled || false,
        hasStoredFcmToken: !!user.fcmToken,
      },
      access_token,
      refresh_token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .populate('campuses')
      .populate('rooms')
      .populate('children')
      .lean();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...result } = user;
    return result;
  }

  /**
   * Check if a campus already has a director assigned
   * @param campusId - The ID of the campus to check
   * @returns True if the campus already has a director, false otherwise
   */
  async campusHasDirector(campusId: string): Promise<boolean> {
    try {
      // First check if the campus exists and has a director assigned in the campus collection
      const campus = await this.userModel.db.collection('campus').findOne({
        _id: new Types.ObjectId(campusId.toString()),
      });

      // If campus has a director field populated, it has a director
      if (campus && campus.campusDirector) {
        console.log(
          `Campus ${campusId} already has director ${campus.campusDirector} assigned`,
        );
        return true;
      }

      // Also check if any user with Director role has this campus assigned
      const directorWithCampus = await this.userModel.findOne({
        role: UserRole.DIRECTOR,
        campuses: campusId,
      });

      if (directorWithCampus) {
        console.log(
          `Campus ${campusId} is assigned to director ${directorWithCampus._id}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        `Error checking if campus ${campusId} has a director:`,
        error,
      );
      return false; // Default to false in case of error
    }
  }

  async addUser(addUserDto: AddUserDto, currentUser?: User) {
    // Require at least one identifier
    if (!addUserDto.email && !addUserDto.username) {
      throw new BadRequestException('Either email or username is required');
    }

    // Specific duplicate checks to provide clear errors
    if (addUserDto.email) {
      const emailExists = await this.userModel.findOne({
        email: addUserDto.email,
      });
      if (emailExists) {
        throw new ConflictException('Email already exists.');
      }
    }

    if (addUserDto.username) {
      const usernameExists = await this.userModel.findOne({
        username: addUserDto.username,
      });
      if (usernameExists) {
        throw new ConflictException('Username already exists.');
      }
    }

    // If user is being created with Director role and has campuses assigned
    if (
      addUserDto.role === UserRole.DIRECTOR &&
      addUserDto.campuses &&
      addUserDto.campuses.length > 0
    ) {
      // Check each campus to see if it already has a director
      for (const campusId of addUserDto.campuses) {
        const hasDirector = await this.campusHasDirector(campusId);
        if (hasDirector) {
          throw new ConflictException(
            'This campus is already assigned to another Director.',
          );
        }
      }
    }

    let hashedPassword;
    let setPasswordToken = null;
    let setPasswordExpires = null;

    // Check if password was provided
    if (addUserDto.password) {
      // Use the provided password
      hashedPassword = await bcrypt.hash(addUserDto.password, 10);
    } else {
      // Generate a random password
      const randomPassword =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Hash the random password
      hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Generate set password token
      setPasswordToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Set token expiration (7 days)
      setPasswordExpires = new Date();
      setPasswordExpires.setDate(setPasswordExpires.getDate() + 7);
    }

    // Special handling for administrator role
    if (addUserDto.role === UserRole.ADMINISTRATOR) {
      // Set access scope to ALL for administrators
      addUserDto.accessScope = AccessScope.ALL;

      try {
        // Fetch all campuses
        const allCampuses = await this.userModel.db
          .collection('campus')
          .find({})
          .toArray();
        addUserDto.campuses = allCampuses.map((campus) =>
          campus._id.toString(),
        );

        // Fetch all rooms
        const allRooms = await this.userModel.db
          .collection('rooms')
          .find({})
          .toArray();
        addUserDto.rooms = allRooms.map((room) => room._id.toString());
      } catch (error) {
        console.error('Error fetching campuses/rooms for admin:', error);
        addUserDto.campuses = [];
        addUserDto.rooms = [];
      }
    }

    // Create new user
    const newUser = new this.userModel({
      ...addUserDto,
      password: hashedPassword,
      setPasswordToken: setPasswordToken,
      setPasswordExpires: setPasswordExpires,
    });

    const savedUser = await newUser.save();

    // Save was successful

    // If this is a Director role, update the campusDirector field in the campus schema
    if (
      savedUser.role === UserRole.DIRECTOR &&
      savedUser.campuses &&
      savedUser.campuses.length > 0
    ) {
      try {
        // Since Director has SINGLE_CAMPUS access, we only need to update one campus
        const campusId = savedUser.campuses[0]; // Get the first (and should be only) campus
        await this.userModel.db
          .collection('campus')
          .updateOne(
            { _id: new Types.ObjectId(campusId.toString()) },
            { $set: { campusDirector: savedUser._id } },
          );
        console.log(
          `Updated campus ${campusId} to set director ${savedUser._id}`,
        );
      } catch (error) {
        console.error('Error updating campus director:', error);
        // We don't throw here to avoid failing the user creation
        // but we log the error for debugging
      }
    }

    // Don't return the password
    const { password: _, ...result } = savedUser.toObject();

    // Generate JWT token
    const payload = {
      email: result.email,
      username: result.username,
      sub: result._id,
      role: result.role,
      accessScope: result.accessScope,
    };

    // Generate access token
    const access_token = this.jwtService.sign(payload);

    // Generate refresh token
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token valid for 7 days
    });

    // Save refresh token to user
    await this.userModel.findByIdAndUpdate(result._id, {
      refreshToken: refresh_token,
    });

    // Email notifications: only send if email exists
    const userFullName = `${result.firstName} ${result.lastName}`;
    if (result.email) {
      if (setPasswordToken) {
        // No password provided: send set-password email and welcome email
        this.emailService.sendSetPasswordEmail(
          result.email,
          setPasswordToken,
          userFullName,
        );
        this.emailService.sendWelcomeEmail(result.email, userFullName);
      } else {
        // Password provided: only send welcome email
        this.emailService.sendWelcomeEmail(result.email, userFullName);
      }
    }

    // Create feed item for new staff members based on rooms
    if (savedUser.role === UserRole.STAFF && savedUser.rooms && savedUser.rooms.length > 0) {
      try {
        const createdById = currentUser?._id?.toString() || savedUser._id.toString();
        
        for (const roomId of savedUser.rooms) {
          const room = await this.userModel.db
            .collection('rooms')
            .findOne({ _id: new Types.ObjectId(roomId.toString()) });
          
          if (room) {
            const roomName = room.name || 'the room';
            const campusId = room.campus ? room.campus.toString() : (savedUser.campuses && savedUser.campuses.length > 0 ? savedUser.campuses[0].toString() : null);
            const staffFullName = `${savedUser.firstName} ${savedUser.lastName}`.trim();
            const title = `Welcome ${staffFullName}`;
            const description = `Please meet our newest staff member at ${roomName}.`;
            
            const visibleUntil = new Date();
            visibleUntil.setDate(visibleUntil.getDate() + 1);
            
            await this.feedService.create(
              {
                type: 'new-staff',
                refId: savedUser._id.toString(),
                isForAllCampuses: false,
                campuses: campusId ? [campusId] : [],
                rooms: [roomId.toString()],
                title,
                description,
                visibleUntil: visibleUntil.toISOString(),
              },
              createdById,
            );
          }
        }
      } catch (error) {
        console.error('Error creating feed item for new staff:', error);
      }
    }

    return {
      user: result,
      access_token,
      refresh_token,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Set token expiration (1 hour)
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    // Save token to user
    await this.userModel.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpires,
    });

    // Send password reset email
    const userFullName = `${user.firstName} ${user.lastName}`;
    const emailSent = await this.emailService.sendForgotPasswordEmail(
      user.email,
      resetToken,
      userFullName,
    );

    if (!emailSent) {
      // If email fails, we should still return success for security reasons
      // but log the error for debugging
      console.error(`Failed to send password reset email to ${email}`);
    }

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    // Send password changed confirmation email
    const userFullName = `${user.firstName} ${user.lastName}`;
    const emailSent = await this.emailService.sendPasswordChangedEmail(
      user.email,
      userFullName,
    );

    if (!emailSent) {
      // Log the error but don't fail the password reset
      console.error(
        `Failed to send password changed confirmation email to ${user.email}`,
      );
    }

    return { message: 'Password has been reset successfully' };
  }
  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Find the user with this refresh token
      const user = await this.userModel.findOne({
        _id: payload.sub,
        refreshToken: refreshToken,
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate new tokens
      const newPayload = {
        email: user.email,
        username: user.username,
        sub: user._id,
        role: user.role,
        accessScope: user.accessScope,
      };

      // Generate new access token
      const access_token = this.jwtService.sign(newPayload);

      // Generate new refresh token
      const new_refresh_token = this.jwtService.sign(newPayload, {
        expiresIn: '7d', // Refresh token valid for 7 days
      });

      // Update the refresh token and lastLogin timestamp in the database
      await this.userModel.findByIdAndUpdate(user._id, {
        refreshToken: new_refresh_token,
        lastLogin: new Date(), // Set lastLogin to current timestamp
      });

      return {
        access_token,
        refresh_token: new_refresh_token,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async checkSession(userId: string) {
    try {
      // Find the user by ID
      const user = await this.userModel.findById(userId).select('-password');

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Don't return the password
      const { password: _, ...result } = user.toObject();

      return {
        isValid: true,
        user: result,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid session');
    }
  }

  /**
   * Change user password
   * @param userId - The ID of the user changing their password
   * @param changePasswordDto - DTO containing current password and new password
   * @returns Success message
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    // Find the user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update the password
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Set password for a user using a token (for admin-created users)
   * @param email - The email of the user
   * @param token - The set password token sent via email
   * @param newPassword - The new password to set
   * @returns Success message
   */
  async setPassword(email: string, token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      email,
      setPasswordToken: token,
      setPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear set password token
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      setPasswordToken: null,
      setPasswordExpires: null,
    });

    // Send password changed confirmation email
    const userFullName = `${user.firstName} ${user.lastName}`;
    const emailSent = await this.emailService.sendPasswordSetEmail(
      user.email,
      userFullName,
    );

    if (!emailSent) {
      // Log the error but don't fail the password set
      console.error(
        `Failed to send password changed confirmation email to ${user.email}`,
      );
    }

    return { message: 'Password has been set successfully' };
  }
}
