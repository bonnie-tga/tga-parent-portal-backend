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
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { ChildService } from '../services/child.service';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto/update-child.dto';
import { MultipleRoomsDto } from '../dto/multiple-rooms.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('children')
@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new child' })
  @ApiResponse({ status: 201, description: 'Child created successfully' })
  @ApiResponse({ status: 404, description: 'Campus, Room, or Parent not found' })
  create(@Body() createChildDto: CreateChildDto) {
    return this.childService.create(createChildDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all children with pagination, filtering, and sorting' })
  @ApiResponse({ status: 200, description: 'Return paginated children' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campusId', required: false, type: String })
  @ApiQuery({ name: 'roomId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'noConcent', required: false, type: Boolean })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('roomId') roomId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('noConcent') noConcent?: string,
  ) {
    return this.childService.findAllWithFilters({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      campusId,
      roomId,
      sortBy,
      sortOrder,
      noConcent: noConcent !== undefined ? noConcent === 'true' : undefined,
    }, user);
  }

  @Get('my-assigned')
  @ApiOperation({ summary: 'Get all children assigned to current user based on access scope' })
  @ApiResponse({ status: 200, description: 'Return all children assigned to current user' })
  findMyAssignedChildren(@CurrentUser() user: User) {
    return this.childService.findMyAssignedChildren(user);
  }

  @Get('by-campus/:campusId')
  @ApiOperation({ summary: 'Get all children by campus' })
  @ApiResponse({ status: 200, description: 'Return all children for a campus' })
  findByCampus(@CurrentUser() user: User, @Param('campusId') campusId: string) {
    return this.childService.findByCampus(campusId, user);
  }

  @Get('by-room/:roomId')
  @ApiOperation({ summary: 'Get all children by room' })
  @ApiResponse({ status: 200, description: 'Return all children for a room' })
  findByRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    return this.childService.findByRoom(roomId, user);
  }

  @Post('multiple-rooms')
  @ApiOperation({ summary: 'Get all children from multiple rooms' })
  @ApiResponse({ status: 200, description: 'Return all children for the selected rooms' })
  @ApiBody({ type: MultipleRoomsDto })
  findByMultipleRooms(@CurrentUser() user: User, @Body() multipleRoomsDto: MultipleRoomsDto) {
    return this.childService.findByMultipleRooms(multipleRoomsDto.roomIds, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a child by id' })
  @ApiResponse({ status: 200, description: 'Return the child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.childService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully updated' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  update(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto) {
    return this.childService.update(id, updateChildDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Delete a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  remove(@Param('id') id: string) {
    return this.childService.remove(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Activate a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully activated' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  activate(@Param('id') id: string) {
    return this.childService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Deactivate a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully deactivated' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  deactivate(@Param('id') id: string) {
    return this.childService.deactivate(id);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Archive a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully archived' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  archive(@Param('id') id: string) {
    return this.childService.archive(id);
  }

  @Patch(':id/unarchive')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Unarchive a child' })
  @ApiResponse({ status: 200, description: 'The child has been successfully unarchived' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  unarchive(@Param('id') id: string) {
    return this.childService.unarchive(id);
  }
}
