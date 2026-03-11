import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MultipleCampusesDto {
  @ApiProperty({
    type: [String],
    description: 'Array of campus IDs to fetch rooms from',
    example: ['5f8d0d55b54764421b71e4b1', '5f8d0d55b54764421b71e4b2']
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  campusIds: string[];
}
