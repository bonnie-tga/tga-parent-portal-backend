import { PartialType } from '@nestjs/swagger';
import { CreateTeamChatDto } from './create-team-chat.dto';

export class UpdateTeamChatDto extends PartialType(CreateTeamChatDto) {}
