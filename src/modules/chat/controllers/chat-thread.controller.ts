import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatThreadService } from '../services/chat-thread.service';
import { CreateChatThreadDto } from '../dto/create-chat-thread.dto';
import { QueryChatThreadDto } from '../dto/query-chat-thread.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('chat-threads')
@Controller('chat-threads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatThreadController {
  constructor(private readonly chatThreadService: ChatThreadService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat thread' })
  @ApiResponse({ status: 201, description: 'Chat thread created successfully' })
  async create(
    @Body() dto: CreateChatThreadDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatThreadService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat threads (filtered by role)' })
  @ApiResponse({ status: 200, description: 'Return all chat threads' })
  async findAll(
    @Query() query: QueryChatThreadDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatThreadService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat thread by ID' })
  @ApiResponse({ status: 200, description: 'Return chat thread' })
  @ApiResponse({ status: 404, description: 'Chat thread not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatThreadService.findById(id, currentUser);
  }
}
