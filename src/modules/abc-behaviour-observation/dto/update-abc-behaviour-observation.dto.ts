import { PartialType } from '@nestjs/swagger';
import { CreateAbcBehaviourObservationDto } from './create-abc-behaviour-observation.dto';

export class UpdateAbcBehaviourObservationDto extends PartialType(
  CreateAbcBehaviourObservationDto,
) {}


