import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, UseInterceptors, UploadedFiles, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ChatMessageService } from '../services/chat-message.service';
import { CreateChatMessageDto } from '../dto/create-chat-message.dto';
import { QueryChatMessageDto } from '../dto/query-chat-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { GoogleStorageService } from '../../../google-drive/google-storage.service';
import { ChatAttachmentType } from '../schemas/chat-message.schema';
import { validateFiles, getFileType } from '../../../common/utils/file-validation.util';

@ApiTags('chat-messages')
@Controller('chat-messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatMessageController {
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly googleStorageService: GoogleStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async create(
    @Body() dto: CreateChatMessageDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatMessageService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated messages for a thread' })
  @ApiResponse({ status: 200, description: 'Return paginated messages' })
  async findAll(
    @Query() query: QueryChatMessageDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatMessageService.findAll(query, currentUser);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatMessageService.markAsRead(id, currentUser);
  }

  @Delete('thread/:threadId/clear')
  @ApiOperation({ summary: 'Clear all messages in a thread' })
  @ApiResponse({ 
    status: 200, 
    description: 'All messages cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chat thread not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async clearThreadMessages(
    @Param('threadId') threadId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatMessageService.clearThreadMessages(threadId, currentUser);
  }

  @Post('upload-media')
  @ApiOperation({ summary: 'Upload media files for chat messages' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max (for videos)
      },
    }),
  )
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: User,
  ) {
    validateFiles(files);

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        try {
          const uploadResult = await this.googleStorageService.uploadFileG(
            file,
            'chat-messages',
          );

          // Determine attachment type from MIME type
          const fileType = getFileType(file.mimetype);
          let attachmentType: ChatAttachmentType = ChatAttachmentType.OTHER;
          if (fileType === 'image') {
            attachmentType = ChatAttachmentType.IMAGE;
          } else if (fileType === 'video') {
            attachmentType = ChatAttachmentType.VIDEO;
          } else if (fileType === 'audio') {
            attachmentType = ChatAttachmentType.AUDIO;
          } else if (fileType === 'document') {
            attachmentType = ChatAttachmentType.DOCUMENT;
          }

          return {
            url: uploadResult.url,
            type: attachmentType,
            name: uploadResult.originalName,
            size: uploadResult.size,
            mimeType: uploadResult.mimeType,
          };
        } catch (error) {
          console.error(`Failed to upload file ${file.originalname}:`, error);
          if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
            throw error;
          }
          throw new BadRequestException(
            `Failed to upload file: ${file.originalname}. ${error.message || error}`,
          );
        }
      }),
    );

    return {
      attachments: uploadResults,
    };
  }
}
