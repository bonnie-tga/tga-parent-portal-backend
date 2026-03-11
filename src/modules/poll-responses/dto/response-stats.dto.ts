import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChoiceStatsDto {
  @ApiProperty()
  choiceId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  percentage!: number;
}

export class QuestionStatsDto {
  @ApiProperty()
  questionId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: [ChoiceStatsDto] })
  choices!: ChoiceStatsDto[];

  @ApiProperty()
  totalResponses!: number;
}

export class ResponseDetailDto {
  @ApiProperty()
  responseId!: string;

  @ApiProperty()
  user!: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  campus!: {
    _id: string;
    name: string;
  };

  @ApiPropertyOptional()
  child?: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  questionId!: string;

  @ApiProperty()
  questionText!: string;

  @ApiProperty({ type: [String] })
  selectedChoices!: Array<{
    choiceId: string;
    label: string;
  }>;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  submittedAt!: Date;
}

export class PollStatsDto {
  @ApiProperty()
  pollId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: [QuestionStatsDto] })
  questions!: QuestionStatsDto[];

  @ApiPropertyOptional()
  userHasVoted?: boolean;

  @ApiPropertyOptional({ type: [String] })
  userSelectedChoiceIds?: string[];

  @ApiProperty({ type: [ResponseDetailDto] })
  responses!: ResponseDetailDto[];

  @ApiProperty()
  totalResponses!: number;
}

