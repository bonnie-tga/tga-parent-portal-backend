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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CampusService } from '../services/campus.service';
import { CreateCampusDto } from '../dto/create-campus.dto';
import { UpdateCampusDto } from '../dto/update-campus.dto';
import { CampusStatus } from '../schemas/campus.schema';
import { PaginatedResultDto } from '../dto/paginated-result.dto';
import { Campus } from '../schemas/campus.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('campus')
@Controller('campus')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class CampusController {
  constructor(private readonly campusService: CampusService) {}


  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Create a new campus' })
  @ApiResponse({ status: 201, description: 'Campus created successfully' })
  @ApiResponse({ status: 409, description: 'Campus with this name already exists' })
  create(@Body() createCampusDto: CreateCampusDto) {
    return this.campusService.create(createCampusDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campuses with pagination, search and filtering' })
  @ApiResponse({ status: 200, description: 'Return paginated campuses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CampusStatus, isArray: true })
  @ApiQuery({ name: 'campusIds', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: CampusStatus | CampusStatus[],
    @Query('campusIds') campusIds?: string[],
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResultDto<Campus>> {
    return this.campusService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      campusIds,
      sortBy,
      sortOrder,
    }, user);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active campuses with pagination and search' })
  @ApiResponse({ status: 200, description: 'Return paginated active campuses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAllActive(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResultDto<Campus>> {
    return this.campusService.findAllActive({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      sortBy,
      sortOrder,
    }, user);
  }

  
  @Get('parent/all')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get all published and active campuses for parents' })
  @ApiResponse({ status: 200, description: 'Return all campuses for parent role' })
  findAllForParent(): Promise<Campus[]> {
    return this.campusService.findAllForParent();
  }
  
  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get campuses by status with pagination and search' })
  @ApiResponse({ status: 200, description: 'Return paginated campuses by status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findByStatus(
    @CurrentUser() user: User,
    @Param('status') status: CampusStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResultDto<Campus>> {
    return this.campusService.findByStatus(status, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      sortBy,
      sortOrder,
    }, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campus by ID' })
  @ApiResponse({ status: 200, description: 'Return the campus' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campusService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update a campus' })
  @ApiResponse({ status: 200, description: 'Campus updated successfully' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  @ApiResponse({ status: 409, description: 'Campus with this name already exists' })
  update(@Param('id') id: string, @Body() updateCampusDto: UpdateCampusDto) {
    return this.campusService.update(id, updateCampusDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Delete a campus' })
  @ApiResponse({ status: 200, description: 'Campus deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  remove(@Param('id') id: string) {
    return this.campusService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Deactivate a campus' })
  @ApiResponse({ status: 200, description: 'Campus deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  deactivate(@Param('id') id: string) {
    return this.campusService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Activate a campus' })
  @ApiResponse({ status: 200, description: 'Campus activated successfully' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  activate(@Param('id') id: string) {
    return this.campusService.activate(id);
  }
  
  @Patch(':id/status/:status')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER)
  @ApiOperation({ summary: 'Update campus status' })
  @ApiResponse({ status: 200, description: 'Campus status updated successfully' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: CampusStatus
  ) {
    return this.campusService.updateStatus(id, status);
  }
}
