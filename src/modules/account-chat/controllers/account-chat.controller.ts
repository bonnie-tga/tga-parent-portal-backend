import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccountChatService } from '../services/account-chat.service';
import { QueryAccountChatDto } from '../dto/query-account-chat.dto';
import { CreateAccountChatDto } from '../dto/create-account-chat.dto';
import { UpdateAccountChatDto } from '../dto/update-account-chat.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('account-chat')
@Controller('account-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountChatController {
  constructor(private readonly accountChatService: AccountChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account chat' })
  @ApiResponse({ status: 201, description: 'Account chat created successfully' })
  @ApiResponse({ status: 409, description: 'Account chat already exists for this campus and room' })
  async create(
    @Body() dto: CreateAccountChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.accountChatService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all account chats (room chats)' })
  @ApiResponse({ status: 200, description: 'Return all account chats' })
  async findAll(
    @Query() query: QueryAccountChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.accountChatService.findAll(query, currentUser);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s account chats' })
  @ApiResponse({ status: 200, description: 'Return current user\'s account chats' })
  async findMyChats(
    @Query() query: QueryAccountChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.accountChatService.findMyChats(query, currentUser);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for account chat' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for account chat records',
  })
  async findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.accountChatService.findArchiveMonths();
  }

  @Get(':id/chat-thread-id')
  @ApiOperation({ summary: 'Get chat thread ID for an account chat' })
  @ApiResponse({ status: 200, description: 'Return chat thread ID' })
  @ApiResponse({ status: 404, description: 'Account chat or chat thread not found' })
  async getChatThreadId(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.accountChatService.findById(id, currentUser);
    const threadId = await this.accountChatService.getChatThreadId(id);
    if (!threadId) {
      throw new NotFoundException('Chat thread not found for this account chat');
    }
    return { threadId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account chat by ID' })
  @ApiResponse({ status: 200, description: 'Return account chat' })
  @ApiResponse({ status: 404, description: 'Account chat not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.accountChatService.findById(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account chat' })
  @ApiResponse({ status: 200, description: 'Account chat updated successfully' })
  @ApiResponse({ status: 404, description: 'Account chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.accountChatService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account chat' })
  @ApiResponse({ status: 200, description: 'Account chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.accountChatService.remove(id, currentUser);
    return { success: true, message: 'Account chat deleted successfully' };
  }
}
