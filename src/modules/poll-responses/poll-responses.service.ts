import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PollResponse, PollResponseDocument } from './schemas/poll-response.schema';
import { Poll, PollDocument } from '../polls/schemas/poll.schema';
import { SubmitPollResponseDto } from './dto/submit-response.dto';
import { PollStatsDto, QuestionStatsDto, ChoiceStatsDto } from './dto/response-stats.dto';
import { isAdministrator } from 'src/common/access/access-filter.util';

@Injectable()
export class PollResponsesService {
  constructor(
    @InjectModel(PollResponse.name)
    private pollResponseModel: Model<PollResponseDocument>,
    @InjectModel(Poll.name)
    private pollModel: Model<PollDocument>,
  ) {}

  async submit(
    userId: string,
    userCampuses: Types.ObjectId[],
    dto: SubmitPollResponseDto,
  ): Promise<{ ok: boolean; updated?: boolean; deleted?: boolean; message?: string }> {
    // Determine campus (strict: must belong to user)
    const campusId = dto.campusId
      ? new Types.ObjectId(dto.campusId)
      : userCampuses?.[0];

    if (!campusId) {
      throw new BadRequestException('Campus ID is required');
    }

    const userCampusSet = new Set((userCampuses || []).map((c) => c.toString()));
    if (!userCampusSet.has(campusId.toString())) {
      throw new BadRequestException('Campus not assigned to current user');
    }

    // Find and validate poll: either targeted to user's campus or visible to all campuses
    const poll = await this.pollModel.findOne({
      _id: new Types.ObjectId(dto.pollId),
      status: 'active',
      isDeleted: false,
      $or: [
        { campuses: { $in: [campusId] } },
        { isForAllCampuses: true },
      ],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found or not available');
    }

    // Polls no longer have start/end dates - they are always available based on status
    // Remove time window validation

    // Validate question index
    if (dto.questionIndex < 0 || dto.questionIndex >= poll.questions.length) {
      throw new BadRequestException(
        `Invalid question index. Poll has ${poll.questions.length} question(s)`,
      );
    }

    const question = poll.questions[dto.questionIndex];
    if (!question || !question.isActive) {
      throw new NotFoundException('Question not found or inactive');
    }

    // Ensure question has an _id (for old polls created before schema fix)
    if (!question._id) {
      throw new BadRequestException(
        'This poll was created with an old schema. Please recreate the poll or contact support.'
      );
    }

    // Enforce single vs multi-select
    if (!poll.isMultipleSelect && dto.selectedChoiceLabels.length > 1) {
      throw new BadRequestException('Multiple selections not allowed for this poll');
    }

    // Find existing response
    const existingResponse = await this.pollResponseModel.findOne({
      pollId: poll._id,
      userId: new Types.ObjectId(userId),
      questionId: question._id,
    });

    // Handle empty selection (user unselected all choices)
    if (dto.selectedChoiceLabels.length === 0) {
      if (existingResponse) {
        // Decrement counts for old choices
        const decOps: any = {};
        const arrayFilters: any[] = [{ 'q._id': question._id }];

        existingResponse.selectedChoiceIds.forEach((choiceId, i) => {
          decOps[`questions.$[q].choices.$[c${i}].count`] = -1;
          arrayFilters.push({ [`c${i}._id`]: choiceId });
        });

        await this.pollModel.updateOne(
          { _id: poll._id },
          { $inc: decOps },
          { arrayFilters },
        );

        // Delete the response
        await this.pollResponseModel.deleteOne({ _id: existingResponse._id });

        return {
          ok: true,
          deleted: true,
          message: 'Response deleted successfully',
        };
      }

      return {
        ok: true,
        message: 'No response to delete',
      };
    }

    // Find choices by label and get their IDs
    const selectedChoices = question.choices.filter(
      (choice) =>
        choice.isActive &&
        dto.selectedChoiceLabels.includes(choice.label),
    );

    if (selectedChoices.length === 0) {
      throw new BadRequestException('No valid choices found with provided labels');
    }

    if (selectedChoices.length !== dto.selectedChoiceLabels.length) {
      const foundLabels = selectedChoices.map((c) => c.label);
      const missingLabels = dto.selectedChoiceLabels.filter(
        (label) => !foundLabels.includes(label),
      );
      throw new BadRequestException(
        `Invalid choice labels: ${missingLabels.join(', ')}`,
      );
    }

    const selectedChoiceIds = selectedChoices.map((c) => c._id);

    if (existingResponse) {
      // UPDATE existing response
      const oldChoiceIds = existingResponse.selectedChoiceIds.map(id => id.toString());
      const newChoiceIds = selectedChoiceIds.map(id => id.toString());

      // Calculate which choices to increment/decrement
      const toDecrement = oldChoiceIds.filter(id => !newChoiceIds.includes(id));
      const toIncrement = newChoiceIds.filter(id => !oldChoiceIds.includes(id));

      // Update counts if there are changes
      if (toDecrement.length > 0 || toIncrement.length > 0) {
        const updateOps: any = {};
        const arrayFilters: any[] = [{ 'q._id': question._id }];
        let filterIndex = 0;

        // Decrement old choices
        toDecrement.forEach((choiceId) => {
          updateOps[`questions.$[q].choices.$[c${filterIndex}].count`] = -1;
          arrayFilters.push({ [`c${filterIndex}._id`]: new Types.ObjectId(choiceId) });
          filterIndex++;
        });

        // Increment new choices
        toIncrement.forEach((choiceId) => {
          updateOps[`questions.$[q].choices.$[c${filterIndex}].count`] = 1;
          arrayFilters.push({ [`c${filterIndex}._id`]: new Types.ObjectId(choiceId) });
          filterIndex++;
        });

        if (Object.keys(updateOps).length > 0) {
          await this.pollModel.updateOne(
            { _id: poll._id },
            { $inc: updateOps },
            { arrayFilters },
          );
        }
      }

      // Update the response document
      await this.pollResponseModel.updateOne(
        { _id: existingResponse._id },
        {
          $set: {
            selectedChoiceIds,
            comment: poll.isCommentEnabled ? dto.comment : undefined,
            requestIdempotencyKey: dto.requestIdempotencyKey,
            campusId,
            childId: dto.childId ? new Types.ObjectId(dto.childId) : undefined,
          },
        },
      );

      return {
        ok: true,
        updated: true,
        message: 'Response updated successfully',
      };
    } else {
      // CREATE new response
      await this.pollResponseModel.create({
        pollId: poll._id,
        userId: new Types.ObjectId(userId),
        campusId,
        childId: dto.childId ? new Types.ObjectId(dto.childId) : undefined,
        questionId: question._id,
        selectedChoiceIds,
        comment: poll.isCommentEnabled ? dto.comment : undefined,
        requestIdempotencyKey: dto.requestIdempotencyKey,
      });

      // Increment counts for each selected choice atomically
      const incOps: any = {};
      const arrayFilters: any[] = [{ 'q._id': question._id }];

      selectedChoiceIds.forEach((choiceId, i) => {
        incOps[`questions.$[q].choices.$[c${i}].count`] = 1;
        arrayFilters.push({ [`c${i}._id`]: choiceId });
      });

      await this.pollModel.updateOne(
        { _id: poll._id },
        { $inc: incOps },
        { arrayFilters },
      );

      return {
        ok: true,
        message: 'Response submitted successfully',
      };
    }
  }

  async getMyResponses(
    userId: string,
    pollId: string,
  ): Promise<PollResponse[]> {
    return this.pollResponseModel
      .find({
        pollId: new Types.ObjectId(pollId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getAllMyResponses(userId: string): Promise<any[]> {
    const responses = await this.pollResponseModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate('pollId', 'title description isMultipleSelect')
      .populate('campusId', 'name')
      .populate('childId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Format the response to include poll details and selected choices
    const formattedResponses = await Promise.all(
      responses.map(async (response) => {
        const poll = await this.pollModel.findById(response.pollId).lean();
        
        if (!poll) {
          return null;
        }

        // Find the question
        const question = poll.questions.find(
          (q) => q._id.toString() === response.questionId.toString(),
        );

        // Map selected choice IDs to choice labels
        const selectedChoices = response.selectedChoiceIds.map((choiceId) => {
          const choice = question?.choices.find(
            (c) => c._id.toString() === choiceId.toString(),
          );
          return {
            choiceId: choiceId.toString(),
            label: choice?.label || 'Unknown',
          };
        });

        return {
          responseId: response._id.toString(),
          poll: {
            _id: (response.pollId as any)._id.toString(),
            title: (response.pollId as any).title,
            description: (response.pollId as any).description,
          },
          campus: response.campusId ? {
            _id: (response.campusId as any)._id.toString(),
            name: (response.campusId as any).name,
          } : null,
          child: response.childId
            ? {
                _id: (response.childId as any)._id.toString(),
                firstName: (response.childId as any).firstName,
                lastName: (response.childId as any).lastName,
              }
            : null,
          questionId: response.questionId.toString(),
          questionText: question?.text || 'Unknown Question',
          selectedChoices,
          comment: response.comment,
          submittedAt: (response as any).createdAt,
        };
      }),
    );

    // Filter out null responses (in case poll was deleted)
    return formattedResponses.filter((r) => r !== null);
  }

  async getPollStats(
    pollId: string,
    userId?: string,
  ): Promise<PollStatsDto> {
    const poll = await this.pollModel
      .findOne({
        _id: new Types.ObjectId(pollId),
        isDeleted: false,
      })
      .lean();

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Get user's responses if userId provided
    let userResponses: PollResponse[] = [];
    if (userId) {
      userResponses = await this.pollResponseModel
        .find({
          pollId: poll._id,
          userId: new Types.ObjectId(userId),
        })
        .lean();
    }

    const userSelectedChoiceIds = userResponses.flatMap((r) =>
      r.selectedChoiceIds.map((id) => id.toString()),
    );

    // Build stats from poll schema (counts are already aggregated)
    const questionStats: QuestionStatsDto[] = poll.questions
      .filter((q) => q.isActive)
      .map((question) => {
        const totalResponses = question.choices.reduce(
          (sum, c) => sum + c.count,
          0,
        );

        const choiceStats: ChoiceStatsDto[] = question.choices
          .filter((c) => c.isActive)
          .map((choice) => ({
            choiceId: choice._id.toString(),
            label: choice.label,
            count: choice.count,
            percentage:
              totalResponses > 0
                ? Math.round((choice.count / totalResponses) * 100)
                : 0,
          }));

        return {
          questionId: question._id.toString(),
          text: question.text,
          choices: choiceStats,
          totalResponses,
        };
      });

    // Get all responses with detailed information
    const allResponses = await this.pollResponseModel
      .find({
        pollId: poll._id,
      })
      .populate('userId', 'firstName lastName')
      .populate('campusId', 'name')
      .populate('childId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // Build detailed responses array
    const detailedResponses = allResponses.map((response) => {
      // Find the question
      const question = poll.questions.find(
        (q) => q._id.toString() === response.questionId.toString(),
      );

      // Map selected choice IDs to choice objects with labels
      const selectedChoices = response.selectedChoiceIds.map((choiceId) => {
        const choice = question?.choices.find(
          (c) => c._id.toString() === choiceId.toString(),
        );
        return {
          choiceId: choiceId.toString(),
          label: choice?.label || 'Unknown',
        };
      });

      return {
        responseId: response._id.toString(),
        user: {
          _id: (response.userId as any)._id.toString(),
          firstName: (response.userId as any).firstName,
          lastName: (response.userId as any).lastName,
        },
        campus: {
          _id: (response.campusId as any)._id.toString(),
          name: (response.campusId as any).name,
        },
        child: response.childId
          ? {
              _id: (response.childId as any)._id.toString(),
              firstName: (response.childId as any).firstName,
              lastName: (response.childId as any).lastName,
            }
          : undefined,
        questionId: response.questionId.toString(),
        questionText: question?.text || 'Unknown Question',
        selectedChoices,
        comment: response.comment,
        submittedAt: (response as any).createdAt,
      };
    });

    return {
      pollId: poll._id.toString(),
      title: poll.title,
      questions: questionStats,
      userHasVoted: userResponses.length > 0,
      userSelectedChoiceIds:
        userSelectedChoiceIds.length > 0 ? userSelectedChoiceIds : undefined,
      responses: detailedResponses,
      totalResponses: allResponses.length,
    };
  }

  async getResponsesByCampus(pollId: string, campusId: string, currentUser?: { role?: string; campuses?: Array<string | Types.ObjectId> }) {
    if (!isAdministrator(currentUser as any)) {
      const allowed = new Set((currentUser?.campuses || []).map((c: any) => c?.toString()));
      if (!allowed.has(String(campusId))) {
        return [];
      }
    }
    return this.pollResponseModel
      .find({
        pollId: new Types.ObjectId(pollId),
        campusId: new Types.ObjectId(campusId),
      })
      .populate('userId', 'firstName lastName')
      .populate('childId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getAggregatedStats(pollId: string, questionId: string) {
    return this.pollResponseModel.aggregate([
      {
        $match: {
          pollId: new Types.ObjectId(pollId),
          questionId: new Types.ObjectId(questionId),
        },
      },
      { $unwind: '$selectedChoiceIds' },
      {
        $group: {
          _id: '$selectedChoiceIds',
          votes: { $sum: 1 },
        },
      },
      { $sort: { votes: -1 } },
    ]);
  }
}

