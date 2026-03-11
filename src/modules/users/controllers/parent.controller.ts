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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { ParentService } from '../services/parent.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { GoogleStorageService } from 'src/google-drive/google-storage.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../schemas/user.schema';

@ApiTags('parents')
@Controller('users/parents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class ParentController {
  constructor(
    private readonly parentService: ParentService,
    private readonly googleStorageService: GoogleStorageService,
  ) {}

  @Post()
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ENROLMENTS,
  )
  @ApiOperation({ summary: 'Create a new parent' })
  @ApiResponse({ status: 201, description: 'Parent created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @UseInterceptors(FilesInterceptor('files')) // Handle multiple file uploads
  async create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Parse body if sent as FormData with JSON string
    const createUserDto: CreateUserDto = body.userData
      ? JSON.parse(body.userData)
      : body;

    // Upload files to Google Cloud Storage
    let mediaUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.googleStorageService.uploadFile(file, 'parents');
        mediaUrls.push(url);
      }
    }

    // Call the parent service to save all data in MongoDB
    return this.parentService.create({
      ...createUserDto,
      mediaUrls,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all parents with pagination, filtering, and sorting',
  })
  @ApiResponse({ status: 200, description: 'Return paginated parents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campusId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @CurrentUser() currentUser: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('status') status?: string | string[],
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.parentService.findAllWithFilters({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      campusId,
      status,
      sortBy,
      sortOrder,
    }, currentUser);
  }

  @Get('by-campus/:campusId')
  @ApiOperation({ summary: 'Get all parents by campus ID' })
  @ApiResponse({ status: 200, description: 'Return all parents for the specified campus' })
  @ApiResponse({ status: 404, description: 'Campus not found' })
  @ApiParam({ name: 'campusId', description: 'Campus ID' })
  getParentsByCampus(
    @Param('campusId') campusId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentService.findAllByCampusId(campusId, currentUser);
  }

  @Get('by-child/:childId')
  @ApiOperation({ summary: 'Get parents by child ID' })
  @ApiResponse({ status: 200, description: 'Return all parents for the specified child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  @ApiParam({ name: 'childId', description: 'Child ID' })
  getParentsByChild(
    @Param('childId') childId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentService.findAllByChildId(childId, currentUser);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get children for a parent' })
  @ApiResponse({ status: 200, description: 'Return all children for the specified parent' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  @ApiParam({ name: 'id', description: 'Parent ID' })
  getChildrenByParent(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentService.findChildrenByParentId(id, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a parent by id' })
  @ApiResponse({ status: 200, description: 'Return the parent' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.parentService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ENROLMENTS,
  )
  @ApiOperation({ summary: 'Update a parent' })
  @ApiResponse({
    status: 200,
    description: 'The parent has been successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.parentService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Delete a parent' })
  @ApiResponse({
    status: 200,
    description: 'The parent has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  remove(@Param('id') id: string) {
    return this.parentService.remove(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Activate a parent' })
  @ApiResponse({
    status: 200,
    description: 'The parent has been successfully activated',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  activate(@Param('id') id: string) {
    return this.parentService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Deactivate a parent' })
  @ApiResponse({
    status: 200,
    description: 'The parent has been successfully deactivated',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  deactivate(@Param('id') id: string) {
    return this.parentService.deactivate(id);
  }

  // @Patch(':id/add-child/:childId')
  // @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR, UserRole.ENROLMENTS)
  // @ApiOperation({ summary: 'Add a child to a parent' })
  // @ApiResponse({ status: 200, description: 'The child has been successfully added to the parent' })
  // @ApiResponse({ status: 404, description: 'Parent or child not found' })
  // addChildToParent(@Param('id') id: string, @Param('childId') childId: string) {
  //   return this.parentService.addChildToParent(id, childId);
  // }

  // @Patch(':id/remove-child/:childId')
  // @Roles(UserRole.ADMINISTRATOR, UserRole.AREA_MANAGER, UserRole.DIRECTOR, UserRole.ENROLMENTS)
  // @ApiOperation({ summary: 'Remove a child from a parent' })
  // @ApiResponse({ status: 200, description: 'The child has been successfully removed from the parent' })
  // @ApiResponse({ status: 404, description: 'Parent or child not found' })
  // removeChildFromParent(@Param('id') id: string, @Param('childId') childId: string) {
  //   return this.parentService.removeChildFromParent(id, childId);
  // }
}
