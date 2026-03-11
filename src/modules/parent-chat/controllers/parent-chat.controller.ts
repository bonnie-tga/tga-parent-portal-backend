import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParentChatService } from '../services/parent-chat.service';
import { QueryParentChatDto } from '../dto/query-parent-chat.dto';
import { CreateParentChatDto } from '../dto/create-parent-chat.dto';
import { UpdateParentChatDto } from '../dto/update-parent-chat.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('parent-chat')
@Controller('parent-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParentChatController {
  constructor(private readonly parentChatService: ParentChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new parent chat' })
  @ApiResponse({ status: 201, description: 'Parent chat created successfully' })
  @ApiResponse({ status: 409, description: 'Parent chat already exists for this campus and room' })
  async create(
    @Body() dto: CreateParentChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentChatService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all parent chats (room chats)' })
  @ApiResponse({ status: 200, description: 'Return all parent chats' })
  async findAll(
    @Query() query: QueryParentChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentChatService.findAll(query, currentUser);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s parent chats' })
  @ApiResponse({ status: 200, description: 'Return current user\'s parent chats' })
  async findMyChats(
    @Query() query: QueryParentChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentChatService.findMyChats(query, currentUser);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for parent chat' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for parent chat records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.parentChatService.findArchiveMonths();
  }

  @Get(':id/chat-thread-id')
  @ApiOperation({ summary: 'Get chat thread ID for a parent chat' })
  @ApiResponse({ status: 200, description: 'Return chat thread ID' })
  @ApiResponse({ status: 404, description: 'Parent chat or chat thread not found' })
  async getChatThreadId(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.parentChatService.findById(id, currentUser);
    const threadId = await this.parentChatService.getChatThreadId(id);
    if (!threadId) {
      throw new Error('Chat thread not found for this parent chat');
    }
    return { threadId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get parent chat by ID' })
  @ApiResponse({ status: 200, description: 'Return parent chat' })
  @ApiResponse({ status: 404, description: 'Parent chat not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentChatService.findById(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update parent chat' })
  @ApiResponse({ status: 200, description: 'Parent chat updated successfully' })
  @ApiResponse({ status: 404, description: 'Parent chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateParentChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.parentChatService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete parent chat' })
  @ApiResponse({ status: 200, description: 'Parent chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Parent chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.parentChatService.remove(id, currentUser);
    return { success: true, message: 'Parent chat deleted successfully' };
  }
}
