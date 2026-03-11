import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StaffChatService } from '../services/staff-chat.service';
import { QueryStaffChatDto } from '../dto/query-staff-chat.dto';
import { CreateStaffChatDto } from '../dto/create-staff-chat.dto';
import { UpdateStaffChatDto } from '../dto/update-staff-chat.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('staff-chat')
@Controller('staff-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffChatController {
  constructor(private readonly staffChatService: StaffChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff chat' })
  @ApiResponse({ status: 201, description: 'Staff chat created successfully' })
  @ApiResponse({ status: 409, description: 'Staff chat already exists' })
  async create(
    @Body() dto: CreateStaffChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all staff chats' })
  @ApiResponse({ status: 200, description: 'Return all staff chats' })
  async findAll(
    @Query() query: QueryStaffChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.findAll(query, currentUser);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s staff chats' })
  @ApiResponse({ status: 200, description: 'Return current user\'s staff chats' })
  async findMyChats(
    @Query() query: QueryStaffChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.findMyChats(query, currentUser);
  }

  @Get(':id/chat-thread-id')
  @ApiOperation({ summary: 'Get chat thread ID for a staff chat' })
  @ApiResponse({ status: 200, description: 'Return chat thread ID' })
  @ApiResponse({ status: 404, description: 'Staff chat or chat thread not found' })
  async getChatThreadId(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.getChatThreadId(id, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff chat by ID' })
  @ApiResponse({ status: 200, description: 'Return staff chat' })
  @ApiResponse({ status: 404, description: 'Staff chat not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.findById(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff chat' })
  @ApiResponse({ status: 200, description: 'Staff chat updated successfully' })
  @ApiResponse({ status: 404, description: 'Staff chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.staffChatService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete staff chat' })
  @ApiResponse({ status: 200, description: 'Staff chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Staff chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.staffChatService.remove(id, currentUser);
    return { success: true, message: 'Staff chat deleted successfully' };
  }
}
