import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CotRoomStatus } from '../schemas/cot-room.schema';

export class CreateCotRoomDto {
  @ApiProperty({ description: 'Name of the cot room' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Campus ID' })
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @ApiPropertyOptional({ description: 'Room ID' })
  @IsMongoId()
  @IsOptional()
  room?: string;

  @ApiPropertyOptional({ 
    description: 'Status of the cot room', 
    enum: CotRoomStatus,
    default: CotRoomStatus.DRAFT
  })
  @IsEnum(CotRoomStatus)
  @IsOptional()
  status?: CotRoomStatus;

  @ApiPropertyOptional({ description: 'Whether the cot room is active', default: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'User ID who created the cot room' })
  @IsMongoId()
  @IsOptional()
  createdBy?: string;
}
