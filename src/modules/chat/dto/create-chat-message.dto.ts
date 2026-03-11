import { IsString, IsMongoId, MinLength, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChatAttachmentType } from '../schemas/chat-message.schema';

export class ChatAttachmentDto {
  @ApiProperty({ description: 'Media file URL' })
  @IsString()
  url: string;

  @ApiProperty({ enum: ChatAttachmentType, description: 'Type of attachment' })
  @IsEnum(ChatAttachmentType)
  type: ChatAttachmentType;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ description: 'MIME type of the file' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateChatMessageDto {
  @ApiProperty({ description: 'Chat thread ID' })
  @IsMongoId()
  threadId: string;

  @ApiPropertyOptional({ 
    description: 'Message content (optional if attachments are provided)',
    minLength: 1 
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.attachments || o.attachments.length === 0)
  @MinLength(1, { message: 'Message is required when no attachments are provided' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Media attachments (images, videos, documents)',
    type: [ChatAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
