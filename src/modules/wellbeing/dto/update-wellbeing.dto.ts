import { PartialType } from '@nestjs/swagger';
import { CreateWellbeingDto } from './create-wellbeing.dto';

export class UpdateWellbeingDto extends PartialType(CreateWellbeingDto) {}
