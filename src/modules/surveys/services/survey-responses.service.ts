import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { SurveyResponse, SurveyResponseDocument } from '../schemas/survey-response.schema';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { isAdministrator, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';
import { SurveyResponseDto } from '../dto/survey-responce.dto';

@Injectable()
export class SurveyResponsesService {
  constructor(
    @InjectModel(SurveyResponse.name) private readonly responseModel: Model<SurveyResponseDocument>,
    @InjectModel(Survey.name) private readonly surveyModel: Model<SurveyDocument>,
  ) { }

  async hasUserSubmittedSurvey(
    userId: string,
    surveyId: string,
    campusIds: Types.ObjectId[]
  ): Promise<{
    submitted: boolean;
    isCompleted?: boolean;
    submittedAt?: Date;
    campusId?: string;
  }> {
    const existingResponse = await this.responseModel.findOne({
      surveyId: new Types.ObjectId(surveyId),
      userId: new Types.ObjectId(userId),
      campusId: { $in: campusIds },
      isDeleted: false,
    });

    if (!existingResponse) {
      return { submitted: false };
    }

    return {
      submitted: true,
      isCompleted: existingResponse.isCompleted,
      submittedAt: existingResponse.completedAt,
      campusId: existingResponse.campusId?.toString()
    };
  }

  async submitResponse(
    userId: string,
    userCampuses: Types.ObjectId[],
    dto: SurveyResponseDto,
  ): Promise<SurveyResponse> {
    // Simple validation - just check survey exists and is published
    // Enforce: selected campus must belong to the user
    const selectedCampusId = new Types.ObjectId(dto.campusId);
    const userCampusIds = (userCampuses || []).map((c) => c.toString());
    if (!userCampusIds.includes(selectedCampusId.toString())) {
      throw new BadRequestException('Campus not assigned to current user');
    }

    // Survey must be published and targeted to either ALL (no campuses) or the selected campus
    const survey = await this.surveyModel.findOne({
      _id: new Types.ObjectId(dto.surveyId),
      status: 'publish',
      isDeleted: false,
      $or: [
        { campuses: { $size: 0 } },
        { campuses: { $in: [selectedCampusId] } },
      ],
    });

    if (!survey) {
      throw new NotFoundException('Survey not found or not available');
    }

    // Check if user already submitted a response for this campus
    const existingResponse = await this.responseModel.findOne({
      surveyId: new Types.ObjectId(dto.surveyId),
      userId: new Types.ObjectId(userId),
      campusId: new Types.ObjectId(dto.campusId),  // Include campus in duplicate check
      isDeleted: false,
    });

    // Convert surveyQuestionCategory to simple format for storage
    const surveyQuestionCategory = dto.surveyQuestionCategory.map(category => ({
      surveyCategoryId: category.surveyCategoryId,
      categoryName: category.categoryName,
      surveyQuestionAnswers: category.surveyQuestionAnswers.map(answer => ({
        surveyQuestionId: answer.surveyQuestionId,
        surveyQuestion: answer.surveyQuestion,
        type: answer.type,
        surveyAnswer: answer.surveyAnswer,
      })),
    }));

    let response;
    if (existingResponse) {
      // Update existing response - simple approach
      existingResponse.surveyQuestionCategory = surveyQuestionCategory;
      existingResponse.isCompleted = dto.isCompleted ?? false;
      existingResponse.completedAt = dto.isCompleted ? new Date() : undefined;
      response = await existingResponse.save();
    } else {
      // Create new response - simple approach
      response = await this.responseModel.create({
        surveyId: new Types.ObjectId(dto.surveyId),
        userId: new Types.ObjectId(userId),
        campusId: new Types.ObjectId(dto.campusId),
        surveyQuestionCategory: surveyQuestionCategory,
        isCompleted: dto.isCompleted ?? false,
        completedAt: dto.isCompleted ? new Date() : undefined,
      });
    }

    return response;
  }

  async listBySurvey(
    surveyId: string,
    page = 1,
    limit = 20,
    userCampuses?: Types.ObjectId[],
  ): Promise<{ data: any[]; meta: { totalItems: number; itemsPerPage: number; currentPage: number; totalPages: number } }> {
    if (!Types.ObjectId.isValid(surveyId)) {
      throw new BadRequestException({ message: 'Invalid surveyId', code: 'INVALID_SURVEY_ID' });
    }

    // Validate pagination params
    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    // Ensure survey exists and not deleted
    const survey = await this.surveyModel.findOne({ _id: new Types.ObjectId(surveyId), isDeleted: false });
    if (!survey) {
      throw new NotFoundException({ message: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
    }

    const match: any = {
      surveyId: new Types.ObjectId(surveyId),
      isDeleted: false,
    };

    if (userCampuses && userCampuses.length > 0) {
      match.campusId = { $in: userCampuses };
    } else {
      // No assigned campuses → no responses visible
      match._id = { $in: [] } as any;
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { _id: 1, firstName: 1, lastName: 1, email: 1 } },
          ],
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'campuses',
          let: { cid: '$campusId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
            { $project: { _id: 1, name: 1 } },
          ],
          as: 'campus',
        },
      },
      { $addFields: { user: { $arrayElemAt: ['$user', 0] }, campus: { $arrayElemAt: ['$campus', 0] } } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (currentPage - 1) * pageLimit },
            { $limit: pageLimit },
          ],
          totalCount: [
            { $count: 'count' },
          ],
        },
      },
    ];

    const result = await this.responseModel.aggregate(pipeline).exec();
    const facet = result[0] || { data: [], totalCount: [] };
    const totalItems = facet.totalCount[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));

    // Ensure dates are serialized as ISO strings automatically by Nest, keep objects as-is
    return {
      data: facet.data,
      meta: {
        totalItems,
        itemsPerPage: pageLimit,
        currentPage,
        totalPages,
      },
    };
  }


  async findOne(id: string, currentUser?: { role?: string; campuses?: Array<string | Types.ObjectId> }): Promise<SurveyResponse> {
    const filter: any = { _id: new Types.ObjectId(id) };
    if (!isAdministrator(currentUser as any)) {
      const strict = buildStrictCampusInFilterByIds(currentUser?.campuses as any, 'campusId');
      Object.assign(filter, strict);
    }
    const response = await this.responseModel
      .findOne(filter)
      .populate('surveyId', 'title')
      .populate('userId', 'firstName lastName email')
      .populate('campusId', 'name');
    if (!response) {
      throw new NotFoundException('Survey response not found');
    }
    return response;
  }
}
