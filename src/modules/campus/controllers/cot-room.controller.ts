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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CotRoomService } from '../services/cot-room.service';
import { CreateCotRoomDto } from '../dto/create-cot-room.dto';
import { UpdateCotRoomDto } from '../dto/update-cot-room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CotRoomStatus } from '../schemas/cot-room.schema';

@ApiTags('cot-rooms')
@Controller('cot-rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CotRoomController {
  constructor(private readonly cotRoomService: CotRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cot room' })
  @ApiResponse({ status: 201, description: 'The cot room has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createCotRoomDto: CreateCotRoomDto) {
    return this.cotRoomService.create(createCotRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cot rooms with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return all cot rooms.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campusId', required: false, type: String })
  @ApiQuery({ name: 'campusName', required: false, type: String })
  @ApiQuery({ name: 'roomId', required: false, type: String })
  @ApiQuery({ name: 'roomName', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('campusId') campusId?: string,
    @Query('campusName') campusName?: string,
    @Query('roomId') roomId?: string,
    @Query('roomName') roomName?: string,
    @Query('status') status?: string | string[],
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.cotRoomService.findAllWithFilters({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      campusId,
      campusName,
      roomId,
      roomName,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active cot rooms' })
  @ApiResponse({ status: 200, description: 'Return all active cot rooms.' })
  findAllActive() {
    return this.cotRoomService.findAllActive();
  }

  @Get('by-campus/:campusId')
  @ApiOperation({ summary: 'Get all cot rooms by campus' })
  @ApiResponse({ status: 200, description: 'Return all cot rooms for a campus.' })
  findByCampus(@Param('campusId') campusId: string) {
    return this.cotRoomService.findByCampus(campusId);
  }

  @Get('by-room/:roomId')
  @ApiOperation({ summary: 'Get all cot rooms by room' })
  @ApiResponse({ status: 200, description: 'Return all cot rooms for a room.' })
  findByRoom(@Param('roomId') roomId: string) {
    return this.cotRoomService.findByRoom(roomId);
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get all cot rooms by status' })
  @ApiResponse({ status: 200, description: 'Return all cot rooms with the specified status.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByStatus(
    @Param('status') status: CotRoomStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cotRoomService.findAllWithFilters({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cot room by id' })
  @ApiResponse({ status: 200, description: 'Return the cot room.' })
  @ApiResponse({ status: 404, description: 'Cot room not found.' })
  findOne(@Param('id') id: string) {
    return this.cotRoomService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cot room' })
  @ApiResponse({ status: 200, description: 'The cot room has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Cot room not found.' })
  update(@Param('id') id: string, @Body() updateCotRoomDto: UpdateCotRoomDto) {
    return this.cotRoomService.update(id, updateCotRoomDto);
  }

  @Patch(':id/status/:status')
  @ApiOperation({ summary: 'Update cot room status' })
  @ApiResponse({ status: 200, description: 'The cot room status has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Cot room not found.' })
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: CotRoomStatus,
  ) {
    return this.cotRoomService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cot room' })
  @ApiResponse({ status: 200, description: 'The cot room has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Cot room not found.' })
  remove(@Param('id') id: string) {
    return this.cotRoomService.remove(id);
  }
}
