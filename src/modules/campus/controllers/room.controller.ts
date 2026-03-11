import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { RoomService } from '../services/room.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { MultipleCampusesDto } from '../dto/multiple-campuses.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 404, description: 'Campus or User not found' })
  @ApiResponse({ status: 409, description: 'Room with this name already exists in this campus' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms with pagination, filtering, and sorting' })
  @ApiResponse({ status: 200, description: 'Return paginated rooms' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campusId', required: false, type: String })
  @ApiQuery({ name: 'campusIds', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'roomIds', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'campusName', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('campusIds') campusIds?: string[],
    @Query('roomIds') roomIds?: string[],
    @Query('campusName') campusName?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('status') status?: string | string[],
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    console.log('User in room controller:', user); // Debug log
    const filters = {
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      campusId,
      campusIds,
      roomIds,
      campusName,
      category,
      type,
      status,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };
    
    return this.roomService.findAllWithFilters(filters, user);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active rooms' })
  @ApiResponse({ status: 200, description: 'Return all active rooms' })
  findAllActive() {
    return this.roomService.findAllActive();
  }

  @Get('campus/:campusId')
  @ApiOperation({ summary: 'Get all rooms for a specific campus' })
  @ApiResponse({ status: 200, description: 'Return all rooms for the campus' })
  findByCampus(@Param('campusId') campusId: string) {
    return this.roomService.findByCampus(campusId);
  }

  @Post('multiple-campuses')
  @ApiOperation({ summary: 'Get all rooms for multiple campuses' })
  @ApiResponse({ status: 200, description: 'Return all rooms for the selected campuses' })
  @ApiBody({ type: MultipleCampusesDto })
  findByMultipleCampuses(@Body() multipleCampusesDto: MultipleCampusesDto) {
    return this.roomService.findByMultipleCampuses(multipleCampusesDto.campusIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a room by ID' })
  @ApiResponse({ status: 200, description: 'Return the room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.roomService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update a room' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 409, description: 'Room with this name already exists in this campus' })
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Deactivate a room' })
  @ApiResponse({ status: 200, description: 'Room deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  deactivate(@Param('id') id: string) {
    return this.roomService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Activate a room' })
  @ApiResponse({ status: 200, description: 'Room activated successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  activate(@Param('id') id: string) {
    return this.roomService.activate(id);
  }
}
