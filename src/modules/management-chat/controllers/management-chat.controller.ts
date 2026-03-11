import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ManagementChatService } from '../services/management-chat.service';
import { QueryManagementChatDto } from '../dto/query-management-chat.dto';
import { CreateManagementChatDto } from '../dto/create-management-chat.dto';
import { UpdateManagementChatDto } from '../dto/update-management-chat.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('management-chat')
@Controller('management-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ManagementChatController {
  constructor(private readonly managementChatService: ManagementChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new management chat' })
  @ApiResponse({ status: 201, description: 'Management chat created successfully' })
  @ApiResponse({ status: 409, description: 'Management chat already exists for this child, parent, and campus' })
  async create(
    @Body() dto: CreateManagementChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.managementChatService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all management chats' })
  @ApiResponse({ status: 200, description: 'Return all management chats' })
  async findAll(
    @Query() query: QueryManagementChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.managementChatService.findAll(query, currentUser);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s management chats' })
  @ApiResponse({ status: 200, description: 'Return current user\'s management chats' })
  async findMyChats(
    @Query() query: QueryManagementChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.managementChatService.findMyChats(query, currentUser);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for management chat' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for management chat records',
  })
  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.managementChatService.findArchiveMonths();
  }

  @Get(':id/chat-thread-id')
  @ApiOperation({ summary: 'Get chat thread ID for a management chat' })
  @ApiResponse({ status: 200, description: 'Return chat thread ID' })
  @ApiResponse({ status: 404, description: 'Management chat or chat thread not found' })
  async getChatThreadId(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.managementChatService.findById(id, currentUser);
    const threadId = await this.managementChatService.getChatThreadId(id);
    if (!threadId) {
      throw new NotFoundException('Chat thread not found for this management chat');
    }
    return { threadId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get management chat by ID' })
  @ApiResponse({ status: 200, description: 'Return management chat' })
  @ApiResponse({ status: 404, description: 'Management chat not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.managementChatService.findById(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update management chat' })
  @ApiResponse({ status: 200, description: 'Management chat updated successfully' })
  @ApiResponse({ status: 404, description: 'Management chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateManagementChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.managementChatService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete management chat' })
  @ApiResponse({ status: 200, description: 'Management chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Management chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.managementChatService.remove(id, currentUser);
    return { success: true, message: 'Management chat deleted successfully' };
  }
}
