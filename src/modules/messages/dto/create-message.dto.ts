import { IsMongoId, IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    type: String,
    description: 'ID of the conversation this message belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  conversation: string;

  @ApiProperty({
    type: String,
    description: 'Content of the message',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of attachment URLs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
