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
import { CotRoomCheckService, ChildCotCheckTime, CotRoomCheckStaffTime } from '../services/cot-room-check.service';
import { CreateCotRoomCheckDto } from '../dto/create-cot-room-check.dto';
import { UpdateCotRoomCheckDto } from '../dto/update-cot-room-check.dto';
import { QueryCotRoomCheckDto } from '../dto/query-cot-room-check.dto';
import { AddChildCotCheckTimeDto } from '../dto/update-child-cot-check-time.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('cot-room-checks')
@Controller('cot-room-checks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class CotRoomCheckController {
  constructor(private readonly cotRoomCheckService: CotRoomCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cot room checks with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Return paginated cot room checks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'campus', required: false, type: String })
  @ApiQuery({ name: 'room', required: false, type: String })
  @ApiQuery({ name: 'staff', required: false, type: String })
  @ApiQuery({ name: 'cotRoom', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(@Query() queryDto: QueryCotRoomCheckDto, @CurrentUser() user: User) {
    return this.cotRoomCheckService.findAll(queryDto, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cot room check' })
  @ApiResponse({ status: 201, description: 'Cot room check created successfully' })
  create(@Body() createCotRoomCheckDto: CreateCotRoomCheckDto, @CurrentUser() user: User) {
    return this.cotRoomCheckService.create(createCotRoomCheckDto, user._id.toString());
  }

  @Get('cot-room/:cotRoomId/children-cot-check-times')
  @ApiOperation({ summary: 'Get all children and their cot check times for editing' })
  @ApiResponse({ status: 200, description: 'Return children with cot check times' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date filter (ISO string)' })
  getChildrenWithCotCheckTimes(
    @Param('cotRoomId') cotRoomId: string,
    @Query('date') date?: string,
    @CurrentUser() user?: User,
  ) {
    const dateFilter = date ? new Date(date) : undefined;
    return this.cotRoomCheckService.getChildrenWithCotCheckTimes(cotRoomId, dateFilter, user);
  }

  @Get('cot-room/:cotRoomId')
  @ApiOperation({ summary: 'Get staff, cot room, and time for a specific cot room' })
  @ApiResponse({ status: 200, description: 'Return staff, cot room, and time information' })
  getStaffCotRoomAndTime(@Param('cotRoomId') cotRoomId: string, @CurrentUser() user?: User) {
    return this.cotRoomCheckService.getStaffCotRoomAndTime(cotRoomId, user);
  }

  @Patch('child/:childId/cot-check-time')
  @ApiOperation({ summary: 'Add a new cot check time for a child' })
  @ApiResponse({ status: 200, description: 'Cot check time added successfully' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  addChildCotCheckTime(
    @Param('childId') childId: string,
    @Body() addDto: AddChildCotCheckTimeDto,
    @CurrentUser() user: User,
  ) {
    return this.cotRoomCheckService.addChildCotCheckTime(
      childId,
      new Date(addDto.time),
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cot room check by ID' })
  @ApiResponse({ status: 200, description: 'Return the cot room check' })
  @ApiResponse({ status: 404, description: 'Cot room check not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cotRoomCheckService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cot room check' })
  @ApiResponse({ status: 200, description: 'Cot room check updated successfully' })
  @ApiResponse({ status: 404, description: 'Cot room check not found' })
  update(@Param('id') id: string, @Body() updateCotRoomCheckDto: UpdateCotRoomCheckDto, @CurrentUser() user: User) {
    return this.cotRoomCheckService.update(id, updateCotRoomCheckDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cot room check' })
  @ApiResponse({ status: 200, description: 'Cot room check deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cot room check not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cotRoomCheckService.remove(id, user);
  }
}
