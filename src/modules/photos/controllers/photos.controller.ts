import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PhotosService } from '../services/photos.service';
import { CreatePhotosDto } from '../dto/create-photos.dto';
import { UpdatePhotosDto } from '../dto/update-photos.dto';
import { QueryPhotosDto } from '../dto/query-photos.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { User } from '../../users/schemas/user.schema';
import { Response } from 'express';

@ApiTags('photos')
@Controller('photos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a photo entry' })
  @ApiResponse({ status: 201, description: 'Photo entry created' })
  create(
    @Body() createPhotosDto: CreatePhotosDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.photosService.create(createPhotosDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List photo entries' })
  @ApiResponse({ status: 200, description: 'List of photo entries returned' })
  findAll(@Query() query: QueryPhotosDto, @CurrentUser() currentUser: User) {
    return this.photosService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get photo entry by ID' })
  @ApiResponse({ status: 200, description: 'Photo entry returned' })
  @ApiResponse({ status: 404, description: 'Photo entry not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.photosService.findOne(id, currentUser);
  }

  @Get(':id/download')
  @Public()
  @ApiOperation({ summary: 'Download photo diary archive' })
  @ApiResponse({
    status: 200,
    description: 'Photo diary archive stream returned',
  })
  download(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: User,
  ) {
    if (!token) {
      throw new BadRequestException('Download token is required');
    }
    return this.photosService.streamDownload(id, token, res, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a photo entry' })
  @ApiResponse({ status: 200, description: 'Photo entry updated' })
  @ApiResponse({ status: 404, description: 'Photo entry not found' })
  update(
    @Param('id') id: string,
    @Body() updatePhotosDto: UpdatePhotosDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.photosService.update(id, updatePhotosDto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a photo entry' })
  @ApiResponse({
    status: 200,
    description: 'Photo entry deleted (soft delete)',
  })
  @ApiResponse({ status: 404, description: 'Photo entry not found' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.photosService.remove(id, currentUser);
  }
}
