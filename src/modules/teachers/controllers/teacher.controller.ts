import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherService } from '../services/teacher.service';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { TeacherAssignCampusDto } from '../dto/assign-campus.dto';
import { AssignRoomDto } from '../dto/assign-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  @ApiResponse({ status: 409, description: 'Teacher with this email already exists' })
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teacherService.create(createTeacherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  @ApiResponse({ status: 200, description: 'Return all teachers' })
  findAll(@CurrentUser() user: User) {
    return this.teacherService.findAll(user);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active teachers' })
  @ApiResponse({ status: 200, description: 'Return all active teachers' })
  findAllActive(@CurrentUser() user: User) {
    return this.teacherService.findAllActive(user);
  }

  @Get('campus/:campusId')
  @ApiOperation({ summary: 'Get teachers by campus ID' })
  @ApiResponse({ status: 200, description: 'Return teachers for the specified campus' })
  findByCampus(@CurrentUser() user: User, @Param('campusId') campusId: string) {
    return this.teacherService.findByCampus(campusId, user);
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'Get teachers by room ID' })
  @ApiResponse({ status: 200, description: 'Return teachers for the specified room' })
  findByRoom(@CurrentUser() user: User, @Param('roomId') roomId: string) {
    return this.teacherService.findByRoom(roomId, user);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get a teacher by email' })
  @ApiResponse({ status: 200, description: 'Return the teacher' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  findByEmail(@Param('email') email: string) {
    return this.teacherService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a teacher by ID' })
  @ApiResponse({ status: 200, description: 'Return the teacher' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.teacherService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 409, description: 'Teacher with this email already exists' })
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Delete a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Deactivate a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  deactivate(@Param('id') id: string) {
    return this.teacherService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Activate a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher activated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  activate(@Param('id') id: string) {
    return this.teacherService.activate(id);
  }

  @Post(':id/assign-campus')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Assign a campus to a teacher' })
  @ApiResponse({ status: 200, description: 'Campus assigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher or campus not found' })
  @ApiResponse({ status: 400, description: 'Campus already assigned to this teacher' })
  assignCampus(@Param('id') id: string, @Body() assignCampusDto: TeacherAssignCampusDto) {
    return this.teacherService.assignCampus(id, assignCampusDto.campusId);
  }

  @Delete(':id/campus/:campusId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Remove a campus from a teacher' })
  @ApiResponse({ status: 200, description: 'Campus removed successfully' })
  @ApiResponse({ status: 404, description: 'Teacher or campus not found' })
  @ApiResponse({ status: 400, description: 'Campus not assigned to this teacher' })
  removeCampus(@Param('id') id: string, @Param('campusId') campusId: string) {
    return this.teacherService.removeCampus(id, campusId);
  }

  @Post(':id/assign-room')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Assign a room to a teacher' })
  @ApiResponse({ status: 200, description: 'Room assigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher or room not found' })
  @ApiResponse({ status: 400, description: 'Room already assigned to this teacher' })
  assignRoom(@Param('id') id: string, @Body() assignRoomDto: AssignRoomDto) {
    return this.teacherService.assignRoom(id, assignRoomDto.roomId);
  }

  @Delete(':id/room/:roomId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Remove a room from a teacher' })
  @ApiResponse({ status: 200, description: 'Room removed successfully' })
  @ApiResponse({ status: 404, description: 'Teacher or room not found' })
  @ApiResponse({ status: 400, description: 'Room not assigned to this teacher' })
  removeRoom(@Param('id') id: string, @Param('roomId') roomId: string) {
    return this.teacherService.removeRoom(id, roomId);
  }
}
