import { PartialType } from '@nestjs/swagger';
import { CreateNappyChangeDto } from './create-nappy-change.dto';

export class UpdateNappyChangeDto extends PartialType(CreateNappyChangeDto) {}


