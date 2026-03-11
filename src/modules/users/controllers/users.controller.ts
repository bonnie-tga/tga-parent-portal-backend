import { Controller, Get, Put, Body, UseGuards, Query, Param, Delete, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../schemas/user.schema';
import { UsersService } from '../services/users.service';
import { UserStats, UsersFilterOptions, UsersPaginationOptions, UsersSortOptions, UsersResponse, RoleInfo, UserWithPermissions } from '../interface/user.interface';
import { UserRole } from '../schemas/user.schema';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiSecurityAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns user statistics',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', example: 10 },
        activeUsers: { type: 'number', example: 8 },
        inactiveUsers: { type: 'number', example: 2 },
        administrators: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(): Promise<UserStats> {
    return this.usersService.getStats();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all user roles with details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a list of all user roles with details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isSystemRole: { type: 'boolean' },
          description: { type: 'string' },
          accessScope: { type: 'string' },
          usersAssigned: { type: 'number' },
          permissions: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoles(): Promise<RoleInfo[]> {
    return this.usersService.getRoles();
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with filtering, pagination, and sorting' })
  @ApiQuery({ name: 'status', enum: ['all', 'active', 'inactive'], required: false })
  @ApiQuery({ name: 'role', enum: Object.values(UserRole), required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'campusId', required: false, description: 'Filter by campus ID' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Filter by room ID' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortDirection', enum: ['asc', 'desc'], required: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a paginated list of users',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              avatar: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              lastLogin: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers(
    @CurrentUser() user: User,
    @Query('status') status?: 'all' | 'active' | 'inactive',
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('roomId') roomId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortField') sortField?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
  ): Promise<UsersResponse> {
    // Build filter options
    const filterOptions: UsersFilterOptions = {
      status,
      search,
      role,
      campusId,
      roomId,
    };
    
    // Build pagination options
    const paginationOptions: UsersPaginationOptions = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    };
    
    // Build sort options
    const sortOptions: UsersSortOptions = {
      field: sortField || 'createdAt',
      direction: sortDirection || 'desc'
    };
    
    return this.usersService.getAllUsers(filterOptions, paginationOptions, sortOptions, user);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Get all soft-deleted users with filtering, pagination, and sorting' })
  @ApiQuery({ name: 'role', enum: Object.values(UserRole), required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'campusId', required: false, description: 'Filter by campus ID' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Filter by room ID' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortDirection', enum: ['asc', 'desc'], required: false })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of deleted users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeletedUsers(
    @CurrentUser() user: User,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('roomId') roomId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortField') sortField?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
  ): Promise<UsersResponse> {
    const filterOptions: UsersFilterOptions = { role, search, campusId, roomId };
    const paginationOptions: UsersPaginationOptions = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    };
    const sortOptions: UsersSortOptions = {
      field: sortField || 'createdAt',
      direction: sortDirection || 'desc',
    };
    return this.usersService.getDeletedUsers(filterOptions, paginationOptions, sortOptions, user);
  }

  @Get('non-parents')
  @ApiOperation({ summary: 'Get all non-parent users filtered by campus access' })
  @ApiQuery({ name: 'campusId', required: false, description: 'Filter by specific campus ID' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortDirection', enum: ['asc', 'desc'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of non-parent users filtered by campus access',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              avatar: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              lastLogin: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              campuses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNonParentUsers(
    @CurrentUser() user: User,
    @Query('campusId') campusId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortField') sortField?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
  ): Promise<UsersResponse> {
    const paginationOptions: UsersPaginationOptions = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    };

    const sortOptions: UsersSortOptions = {
      field: sortField || 'createdAt',
      direction: sortDirection || 'desc',
    };

    return this.usersService.getNonParentUsers(campusId, paginationOptions, sortOptions, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID with permissions' })
  @ApiResponse({ status: 200, description: 'Returns the user with permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserWithPermissions> {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiBody({
    description: 'User data to update',
    type: UpdateUserDto
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the updated user with permissions',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        lastLogin: { type: 'string', format: 'date-time', nullable: true },
        roleDetails: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            accessScope: { type: 'string' },
            permissions: { type: 'number' },
            permissionStrings: { type: 'array', items: { type: 'string' } },
            details: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data provided' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User
  ): Promise<UserWithPermissions> {
    return this.usersService.updateUser(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.deleteUser(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user by ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found or not deleted' })
  async restoreUser(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.restoreUser(id);
  }

}
