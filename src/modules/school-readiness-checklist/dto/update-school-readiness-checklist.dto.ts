import { PartialType } from '@nestjs/swagger';
import { CreateSchoolReadinessChecklistDto } from './create-school-readiness-checklist.dto';

export class UpdateSchoolReadinessChecklistDto extends PartialType(
  CreateSchoolReadinessChecklistDto,
) {}


