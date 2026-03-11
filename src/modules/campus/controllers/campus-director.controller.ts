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
import { CampusDirectorService } from '../services/campus-director.service';
import { CreateCampusDirectorDto } from '../dto/create-campus-director.dto';
import { UpdateCampusDirectorDto } from '../dto/update-campus-director.dto';
import { AssignCampusDto } from '../dto/assign-campus.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

@ApiTags('campus-director')
@Controller('campus-director')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampusDirectorController {
  constructor(private readonly campusDirectorService: CampusDirectorService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Create a new campus director' })
  @ApiResponse({ status: 201, description: 'Campus director created successfully' })
  @ApiResponse({ status: 409, description: 'Campus director with this email already exists' })
  create(@Body() createCampusDirectorDto: CreateCampusDirectorDto) {
    return this.campusDirectorService.create(createCampusDirectorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campus directors' })
  @ApiResponse({ status: 200, description: 'Return all campus directors' })
  findAll() {
    return this.campusDirectorService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active campus directors' })
  @ApiResponse({ status: 200, description: 'Return all active campus directors' })
  findAllActive() {
    return this.campusDirectorService.findAllActive();
  }

  @Get('campus/:campusId')
  @ApiOperation({ summary: 'Get campus directors by campus ID' })
  @ApiResponse({ status: 200, description: 'Return campus directors for the specified campus' })
  findByCampus(@Param('campusId') campusId: string) {
    return this.campusDirectorService.findByCampus(campusId);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get a campus director by email' })
  @ApiResponse({ status: 200, description: 'Return the campus director' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  findByEmail(@Param('email') email: string) {
    return this.campusDirectorService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campus director by ID' })
  @ApiResponse({ status: 200, description: 'Return the campus director' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  findOne(@Param('id') id: string) {
    return this.campusDirectorService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Update a campus director' })
  @ApiResponse({ status: 200, description: 'Campus director updated successfully' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  @ApiResponse({ status: 409, description: 'Campus director with this email already exists' })
  update(@Param('id') id: string, @Body() updateCampusDirectorDto: UpdateCampusDirectorDto) {
    return this.campusDirectorService.update(id, updateCampusDirectorDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Delete a campus director' })
  @ApiResponse({ status: 200, description: 'Campus director deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  remove(@Param('id') id: string) {
    return this.campusDirectorService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Deactivate a campus director' })
  @ApiResponse({ status: 200, description: 'Campus director deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  deactivate(@Param('id') id: string) {
    return this.campusDirectorService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Activate a campus director' })
  @ApiResponse({ status: 200, description: 'Campus director activated successfully' })
  @ApiResponse({ status: 404, description: 'Campus director not found' })
  activate(@Param('id') id: string) {
    return this.campusDirectorService.activate(id);
  }

  @Post(':id/assign-campus')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Assign a campus to a director' })
  @ApiResponse({ status: 200, description: 'Campus assigned successfully' })
  @ApiResponse({ status: 404, description: 'Campus director or campus not found' })
  @ApiResponse({ status: 400, description: 'Campus already assigned to this director' })
  assignCampus(@Param('id') id: string, @Body() assignCampusDto: AssignCampusDto) {
    return this.campusDirectorService.assignCampus(id, assignCampusDto.campusId);
  }

  @Delete(':id/campus/:campusId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Remove a campus from a director' })
  @ApiResponse({ status: 200, description: 'Campus removed successfully' })
  @ApiResponse({ status: 404, description: 'Campus director or campus not found' })
  @ApiResponse({ status: 400, description: 'Campus not assigned to this director' })
  removeCampus(@Param('id') id: string, @Param('campusId') campusId: string) {
    return this.campusDirectorService.removeCampus(id, campusId);
  }
}