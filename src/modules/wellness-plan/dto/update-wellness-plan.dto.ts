import { PartialType } from '@nestjs/swagger';
import { CreateWellnessPlanDto } from './create-wellness-plan.dto';

export class UpdateWellnessPlanDto extends PartialType(CreateWellnessPlanDto) {}


