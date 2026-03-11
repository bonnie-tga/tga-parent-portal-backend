import { PartialType } from '@nestjs/swagger';
import { CreateToiletTrainingDto } from './create-toilet-training.dto';

export class UpdateToiletTrainingDto extends PartialType(CreateToiletTrainingDto) {}


