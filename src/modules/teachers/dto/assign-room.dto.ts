import { IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoomDto {
  @ApiProperty({
    example: '60d21b4667d0d8992e610c86',
    description: 'ID of the room to assign to the teacher',
  })
  @IsMongoId()
  @IsNotEmpty()
  roomId: string;
}
