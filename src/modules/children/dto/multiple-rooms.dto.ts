import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MultipleRoomsDto {
  @ApiProperty({
    type: [String],
    description: 'Array of room IDs to fetch children from',
    example: ['5f8d0d55b54764421b71e4b1', '5f8d0d55b54764421b71e4b2']
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  roomIds: string[];
}
