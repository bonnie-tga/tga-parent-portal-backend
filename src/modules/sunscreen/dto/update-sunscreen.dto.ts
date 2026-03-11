import { PartialType } from '@nestjs/swagger';
import { CreateSunscreenDto } from './create-sunscreen.dto';

export class UpdateSunscreenDto extends PartialType(CreateSunscreenDto) {}


