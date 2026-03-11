import { IsEnum, IsDateString, IsOptional, IsString, IsMongoId } from 'class-validator';
import { ImmunisationType } from '../schemas/immunisation-reminder.schema';

export class CreateImmunisationReminderDto {
  @IsMongoId()
  childId!: string;

  @IsMongoId()
  campusId!: string;

  @IsMongoId()
  roomId!: string;

  @IsEnum(ImmunisationType)
  remindAbout!: ImmunisationType;

  @IsDateString()
  reminderDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  sentToEmail?: string;
}
