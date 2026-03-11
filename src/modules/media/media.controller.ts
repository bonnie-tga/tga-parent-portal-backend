import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { User } from 'src/modules/users/schemas/user.schema';
import { MediaService } from './media.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GoogleStorageService } from 'src/google-drive/google-storage.service';
import { CreateMediaDto } from './media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../auth/decorators/api-bearer-auth.decorator';
import { MediaType } from './media.entity';

//
@ApiSecurityAuth()
@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly googleStorageService: GoogleStorageService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get all media with pagination, filtering, and sorting',
  })
  @ApiResponse({ status: 200, description: 'Return paginated media' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'mediaType', required: false, enum: MediaType, isArray: true })
  @ApiQuery({ name: 'dateRange', required: false, enum: ['all', 'today', 'this_week', 'this_month'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by file name' })
  findAll(
    @CurrentUser() currentUser: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('mediaType') mediaType?: MediaType | MediaType[],
    @Query('dateRange') dateRange?: 'all' | 'today' | 'this_week' | 'this_month',
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    filters.page = page ? +page : 1;
    filters.limit = limit ? +limit : 10;
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;
    filters.mediaType = mediaType;
    if (dateRange) filters.dateRange = dateRange;
    if (search) filters.search = search;

    return this.mediaService.findAllWithFilters(
      filters,
      currentUser,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a media by ID' })
  @ApiResponse({ status: 200, description: 'Return media' })
  async findMediaById(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.mediaService.findMediaById(id, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a media by ID (campus restricted)' })
  async softDelete(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.mediaService.softDeleteByCampus(id, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/hard')
  @ApiOperation({ summary: 'Permanently delete a media by ID (admin only)' })
  async hardDelete(@Param('id') id: string, @CurrentUser() currentUser: User) {
    await this.mediaService.hardDeleteByCampus(id, currentUser);
    return { message: 'Media permanently deleted' };
  }

  // upload media
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @ApiOperation({ summary: 'Upload media' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files')) // Handle multiple file uploads
  async uploadMedia(
    @Body() createMediaDto: CreateMediaDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: User,
  ) {
    console.log(currentUser);
    // Check if files were provided
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'No files provided. Please upload at least one file.',
      );
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        try {
          const url = await this.googleStorageService.uploadFile(
            file,
            'announcements',
          );
          return { file, url };
        } catch (error) {
          console.error(`Failed to upload file ${file.originalname}:`, error);
          return { file, url: null as string | null };
        }
      }),
    );

    const mediaUrls = uploadResults
      .filter((r) => !!r.url)
      .map((r) => r.url as string);

    if (mediaUrls.length === 0) {
      throw new BadRequestException(
        'No files were successfully uploaded. Please check your files and try again.',
      );
    }

    const campusesToAssign =
      createMediaDto.campuses && createMediaDto.campuses.length > 0
        ? createMediaDto.campuses
        : currentUser.campuses.map((c) => c.toString());

    return this.mediaService.create(
      mediaUrls,
      { ...createMediaDto, campuses: campusesToAssign },
      currentUser,
      files.map((f) => f.size),
    );
  }
}
