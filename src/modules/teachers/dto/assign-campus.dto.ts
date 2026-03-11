import { IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TeacherAssignCampusDto {
  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    description: 'ID of the campus to assign to the teacher',
  })
  @IsMongoId()
  @IsNotEmpty()
  campusId: string;
}
