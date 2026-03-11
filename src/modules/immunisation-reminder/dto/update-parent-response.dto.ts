import { IsEnum, IsMongoId } from 'class-validator';
import { ParentResponseStatus } from '../schemas/immunisation-reminder.schema';

export class UpdateParentResponseDto {
  @IsMongoId()
  reminderId!: string;

  @IsEnum(ParentResponseStatus)
  parentResponse!: ParentResponseStatus;
}
