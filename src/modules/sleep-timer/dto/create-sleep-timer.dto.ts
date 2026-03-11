import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { sleepTimerStatus } from '../schemas/sleep-timer.schema';

export class CreateSleepTimerDto {
  @IsMongoId()
  @IsNotEmpty()
  campus: string;

  @IsMongoId()
  @IsNotEmpty()
  room: string;

  @IsMongoId()
  @IsNotEmpty()
  child: string;

  @IsMongoId()
  @IsNotEmpty()
  cotRoom: string;

  @IsEnum(sleepTimerStatus)
  @IsOptional()
  status?: sleepTimerStatus;
}
