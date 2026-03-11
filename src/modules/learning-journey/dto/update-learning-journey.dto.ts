import { PartialType } from '@nestjs/swagger';
import { CreateLearningJourneyDto } from './create-learning-journey.dto';

export class UpdateLearningJourneyDto extends PartialType(CreateLearningJourneyDto) {}
