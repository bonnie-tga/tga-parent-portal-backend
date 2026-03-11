import { IsOptional, IsMongoId } from 'class-validator';

export class QueryImmunisationReminderDto {
  @IsOptional()
  @IsMongoId()
  childId?: string;

  @IsOptional()
  @IsMongoId()
  campusId?: string;

  @IsOptional()
  @IsMongoId()
  roomId?: string;
}
