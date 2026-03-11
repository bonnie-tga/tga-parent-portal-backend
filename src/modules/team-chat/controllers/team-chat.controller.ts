import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeamChatService } from '../services/team-chat.service';
import { QueryTeamChatDto } from '../dto/query-team-chat.dto';
import { CreateTeamChatDto } from '../dto/create-team-chat.dto';
import { UpdateTeamChatDto } from '../dto/update-team-chat.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('team-chat')
@Controller('team-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamChatController {
  constructor(private readonly teamChatService: TeamChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team chat' })
  @ApiResponse({ status: 201, description: 'Team chat created successfully' })
  async create(
    @Body() dto: CreateTeamChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all team chats' })
  @ApiResponse({ status: 200, description: 'Return all team chats' })
  async findAll(
    @Query() query: QueryTeamChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.findAll(query, currentUser);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s team chats' })
  @ApiResponse({ status: 200, description: 'Return current user\'s team chats' })
  async findMyChats(
    @Query() query: QueryTeamChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.findMyChats(query, currentUser);
  }

  @Get(':id/chat-thread-id')
  @ApiOperation({ summary: 'Get chat thread ID for a team chat' })
  @ApiResponse({ status: 200, description: 'Return chat thread ID' })
  @ApiResponse({ status: 404, description: 'Team chat or chat thread not found' })
  async getChatThreadId(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.getChatThreadId(id, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team chat by ID' })
  @ApiResponse({ status: 200, description: 'Return team chat' })
  @ApiResponse({ status: 404, description: 'Team chat not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.findById(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team chat' })
  @ApiResponse({ status: 200, description: 'Team chat updated successfully' })
  @ApiResponse({ status: 404, description: 'Team chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamChatDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.teamChatService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team chat' })
  @ApiResponse({ status: 200, description: 'Team chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team chat not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.teamChatService.remove(id, currentUser);
    return { success: true, message: 'Team chat deleted successfully' };
  }
}
