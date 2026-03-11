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
import { NappyChangeService } from '../services/nappy-change.service';
import { CreateNappyChangeDto } from '../dto/create-nappy-change.dto';
import { UpdateNappyChangeDto } from '../dto/update-nappy-change.dto';
import { QueryNappyChangeDto } from '../dto/query-nappy-change.dto';
import { NappyChange } from '../schemas/nappy-change.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('nappy-change')
@Controller('nappy-change')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class NappyChangeController {
  constructor(private readonly service: NappyChangeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new nappy change record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  // @AutoFeed({ type: 'nappy-change', action: 'create' })
  create(@Body() dto: CreateNappyChangeDto, @CurrentUser() user: User): Promise<NappyChange> {
    return this.service.create(dto, String(user._id));
  }

  @Get()
  @ApiOperation({ summary: 'List nappy change records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return paginated nappy change records' })
  findAll(
    @Query() query: QueryNappyChangeDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<NappyChange>> {
    return this.service.findAll(query, user);
  }

  @Get('by-filters')
  @ApiOperation({ summary: 'Get nappy change record by date, campus, and room' })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2024-01-15', description: 'Date in ISO format' })
  @ApiQuery({ name: 'campus', required: true, type: String, description: 'Campus ID' })
  @ApiQuery({ name: 'room', required: true, type: String, description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Return complete nappy change record with message' })
  findByDateCampusRoom(
    @Query('date') date: string,
    @Query('campus') campus: string,
    @Query('room') room: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string; data: NappyChange | null }> {
    return this.service.findByDateCampusRoom(date, campus, room, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a nappy change record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<NappyChange> {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a nappy change record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  // @AutoFeed({ type: 'nappy-change', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateNappyChangeDto, @CurrentUser() user: User): Promise<NappyChange> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nappy change record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  // @AutoFeed({ type: 'nappy-change', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.service.remove(id, user);
    return { success: true };
  }
}


