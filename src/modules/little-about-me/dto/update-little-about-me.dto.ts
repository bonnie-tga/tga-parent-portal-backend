import { PartialType } from '@nestjs/swagger';
import { CreateLittleAboutMeDto } from './create-little-about-me.dto';

export class UpdateLittleAboutMeDto extends PartialType(
  CreateLittleAboutMeDto,
) {}