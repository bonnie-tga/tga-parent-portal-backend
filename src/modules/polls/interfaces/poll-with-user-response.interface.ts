import { Types } from 'mongoose';
import { Poll } from '../schemas/poll.schema';

export interface PollWithUserResponse extends Poll {
  userHasVoted?: boolean;
  userResponses?: Array<{
    questionId: Types.ObjectId;
    selectedChoiceIds: Types.ObjectId[];
    comment?: string;
  }>;
  totalResponses?: number;
}

