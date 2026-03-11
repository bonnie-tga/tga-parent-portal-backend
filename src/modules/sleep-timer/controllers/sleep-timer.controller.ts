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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SleepTimerService } from '../services/sleep-timer.service';
import { CreateSleepTimerDto } from '../dto/create-sleep-timer.dto';
import { UpdateSleepTimerDto } from '../dto/update-sleep-timer.dto';
import { QuerySleepTimerDto } from '../dto/query-sleep-timer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('sleep-timers')
@Controller('sleep-timers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class SleepTimerController {
  constructor(private readonly sleepTimerService: SleepTimerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sleep timer' })
  @ApiResponse({ status: 201, description: 'Sleep timer created successfully' })
  create(@Body() createSleepTimerDto: CreateSleepTimerDto, @CurrentUser() user: User) {
    return this.sleepTimerService.create(createSleepTimerDto, user._id.toString());
  }

  @Get()
  @ApiOperation({ summary: 'Get all sleep timers with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Return paginated sleep timers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campus', required: false, type: String })
  @ApiQuery({ name: 'room', required: false, type: String })
  @ApiQuery({ name: 'child', required: false, type: String })
  @ApiQuery({ name: 'cotRoom', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(@Query() queryDto: QuerySleepTimerDto, @CurrentUser() user: User) {
    return this.sleepTimerService.findAll(queryDto, user);
  }

  @Get('child/:childId')
  @ApiOperation({ summary: 'Get all sleep timers by child ID' })
  @ApiResponse({ status: 200, description: 'Return sleep timers for the child' })
  findByChildId(@Param('childId') childId: string, @CurrentUser() user: User) {
    return this.sleepTimerService.findByChildId(childId, user);
  }

  @Get('cot-room/:cotRoomId')
  @ApiOperation({ summary: 'Get all sleep timers for a cot room' })
  @ApiResponse({ status: 200, description: 'Return all sleep timers for the cot room' })
  findByCotRoom(@Param('cotRoomId') cotRoomId: string, @CurrentUser() user: User) {
    return this.sleepTimerService.findByCotRoom(cotRoomId, user);
  }

  @Get('cot-room/:cotRoomId/currently-sleeping')
  @ApiOperation({ summary: 'Get currently sleeping children in a cot room' })
  @ApiResponse({ status: 200, description: 'Return currently sleeping children' })
  getCurrentlySleeping(@Param('cotRoomId') cotRoomId: string, @CurrentUser() user: User) {
    return this.sleepTimerService.getCurrentlySleeping(cotRoomId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sleep timer by ID' })
  @ApiResponse({ status: 200, description: 'Return the sleep timer' })
  @ApiResponse({ status: 404, description: 'Sleep timer not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sleepTimerService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sleep timer' })
  @ApiResponse({ status: 200, description: 'Sleep timer updated successfully' })
  @ApiResponse({ status: 404, description: 'Sleep timer not found' })
  update(@Param('id') id: string, @Body() updateSleepTimerDto: UpdateSleepTimerDto, @CurrentUser() user: User) {
    return this.sleepTimerService.update(id, updateSleepTimerDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sleep timer' })
  @ApiResponse({ status: 200, description: 'Sleep timer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sleep timer not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sleepTimerService.remove(id, user);
  }

  @Patch(':id/start-sleep')
  @ApiOperation({ summary: 'Start sleep timer for a child' })
  @ApiResponse({ status: 200, description: 'Sleep started successfully' })
  @ApiResponse({ status: 400, description: 'Child is already sleeping' })
  startSleep(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sleepTimerService.startSleep(id, user);
  }

  @Patch(':id/end-sleep')
  @ApiOperation({ summary: 'End sleep timer for a child' })
  @ApiResponse({ status: 200, description: 'Sleep ended successfully' })
  @ApiResponse({ status: 400, description: 'Child is already awake' })
  endSleep(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sleepTimerService.endSleep(id, user);
  }
}
