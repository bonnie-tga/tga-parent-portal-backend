import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { ToiletTrainingService } from '../services/toilet-training.service';
import { CreateToiletTrainingDto } from '../dto/create-toilet-training.dto';
import { UpdateToiletTrainingDto } from '../dto/update-toilet-training.dto';
import { QueryToiletTrainingDto } from '../dto/query-toilet-training.dto';
import { ToiletTraining } from '../schemas/toilet-training.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('toilet-training')
@Controller('toilet-training')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class ToiletTrainingController {
  constructor(private readonly service: ToiletTrainingService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new toilet training record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  // @AutoFeed({ type: 'toilet-training', action: 'create' })
  create(@Body() dto: CreateToiletTrainingDto, @CurrentUser() user: User): Promise<ToiletTraining> {
    return this.service.create(dto, String(user._id));
  }

  @Get()
  @ApiOperation({ summary: 'List toilet training records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return paginated toilet training records' })
  findAll(
    @Query() query: QueryToiletTrainingDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<ToiletTraining>> {
    return this.service.findAll(query, user);
  }

  @Get('by-filters')
  @ApiOperation({ summary: 'Get toilet training record by date, campus, and room' })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2024-01-15', description: 'Date in ISO format' })
  @ApiQuery({ name: 'campus', required: true, type: String, description: 'Campus ID' })
  @ApiQuery({ name: 'room', required: true, type: String, description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Return complete toilet training record with message' })
  findByDateCampusRoom(
    @Query('date') date: string,
    @Query('campus') campus: string,
    @Query('room') room: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string; data: ToiletTraining | null }> {
    return this.service.findByDateCampusRoom(date, campus, room, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a toilet training record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<ToiletTraining> {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a toilet training record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  // @AutoFeed({ type: 'toilet-training', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateToiletTrainingDto, @CurrentUser() user: User): Promise<ToiletTraining> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a toilet training record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  // @AutoFeed({ type: 'toilet-training', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.service.remove(id, user);
    return { success: true };
  }
}


