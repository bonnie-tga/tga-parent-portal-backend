import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Survey, SurveyCategory, SurveyDocument } from '../schemas/survey.schema';
import { SurveyStatus } from '../enums/survey-status.enum';
import { SurveyQuestionType } from '../enums/survey-question-type.enum';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { UpdateSurveyDto } from '../dto/update-survey.dto';
import { QuerySurveyDto } from '../dto/query-survey.dto';
import { SurveyCategoryDto } from '../dto/survey-question.dto';
import { PaginatedDto } from '../../../common/dto/paginated.dto';
import { AccessScope, UserRole, User } from '../../users/schemas/user.schema';
import { buildEntityCampusAccessFilterByIds, buildStrictCampusInFilterByIds } from 'src/common/access/access-filter.util';
import { EmailService } from '../../email/services/email.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

const OPTION_BASED_TYPES = new Set<SurveyQuestionType>([
  SurveyQuestionType.MULTIPLE_CHOICE,
  SurveyQuestionType.DROPDOWN,
]);

type AuthenticatedUser = {
  _id: string | Types.ObjectId;
  role: UserRole;
  accessScope: AccessScope;
  campuses?: Array<string | Types.ObjectId>;
};

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name) private readonly surveyModel: Model<SurveyDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createSurveyDto: CreateSurveyDto,
    user: AuthenticatedUser,
  ): Promise<Survey> {
    const campuses = this.mapCampusIds(createSurveyDto.campusIds);
    const surveyQuestions = this.transformSurveyQuestions(
      createSurveyDto.surveyQuestions,
    );

    const survey = new this.surveyModel({
      title: createSurveyDto.title.trim(),
      campuses,
      scheduledDate: createSurveyDto.date
        ? new Date(createSurveyDto.date)
        : undefined,
      category: createSurveyDto.category?.trim(),
      feedbackActioned: createSurveyDto.feedbackActioned ?? false,
      status: createSurveyDto.status ?? SurveyStatus.DRAFT,
      surveyQuestions,
      createdBy: new Types.ObjectId(user._id),
    });

    const savedSurvey = await survey.save();

    try {
      const campusIds = (savedSurvey.campuses || [])
        .map((campus: any) => {
          if (campus instanceof Types.ObjectId) {
            return campus.toString();
          }
          if (campus && typeof campus === 'object' && campus._id) {
            return campus._id.toString();
          }
          return campus ? String(campus) : undefined;
        })
        .filter((id): id is string => Boolean(id));

      // Send notifications to users in the relevant campuses
      if (savedSurvey.status === SurveyStatus.PUBLISH) {
        if (campusIds.length === 0) {
          // For all campuses, skip campus-based notifications
        } else {
          const tasks = campusIds.map((campusId) =>
            this.notificationsService
              .sendByCampus(
                campusId,
                'New Survey Available',
                `${savedSurvey.title} - Please share your feedback!`,
                {
                  refModel: 'Survey',
                  relatedEntityId: savedSurvey._id.toString(),
                  event: 'created',
                  meta: { url: `/survey/${savedSurvey._id.toString()}/submit-survey` },
                  recipientRole: 'parent',
                },
              )
              .catch((err) => console.error(`Failed to send notifications for campus ${campusId}:`, err)),
          );
          void Promise.allSettled(tasks);
        }
      }
    } catch (error) {
      console.error('Failed to schedule notifications for survey:', error);
    }

    // Fire-and-forget email notification to configured recipients (only for ho-survey)
    try {
      if (savedSurvey.category === 'ho-survey') {
        void this.emailService
          .sendSurveyCreatedNotification(savedSurvey.title)
          .catch((emailError) =>
            console.error('Failed to send survey created notification email:', emailError),
          );
      }
    } catch (emailError) {
      console.error('Failed to schedule email notification for survey:', emailError);
    }

    return savedSurvey;
  }

  async findAll(
    queryDto: QuerySurveyDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedDto<Survey>> {
    const filter: FilterQuery<SurveyDocument> = { isDeleted: false };

    if (queryDto.status) {
      filter.status = queryDto.status;
    }

    const andConditions: FilterQuery<SurveyDocument>[] = [];

    if (queryDto.campusId) {
      const campusObjectId = new Types.ObjectId(queryDto.campusId);
      andConditions.push({
        $or: [
          { campuses: { $in: [campusObjectId] } },
          { campuses: { $exists: false } },
          { campuses: { $size: 0 } },
        ],
      });
    }

    if (queryDto.search) {
      const regex = new RegExp(queryDto.search, 'i');
      andConditions.push({
        $or: [
          { title: { $regex: regex } },
          { category: { $regex: regex } },
          { 'surveyQuestions.categoryName': { $regex: regex } },
          { 'surveyQuestions.questions.question': { $regex: regex } },
        ],
      });
    }

    // Strict campus scoping via shared util: Admin sees all; others only own campuses
    if (user?.role !== UserRole.ADMINISTRATOR) {
      const strictAccess = buildStrictCampusInFilterByIds(user?.campuses as any, 'campuses');
      andConditions.push(strictAccess as any);
    }

    if (andConditions.length) {
      filter.$and = andConditions;
    }

    const limit = queryDto.limit ?? 20;
    const skip = queryDto.skip ?? 0;

    const [data, totalItems] = await Promise.all([
      this.surveyModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('campuses', 'name')
        .populate('createdBy', 'firstName lastName email')
        .lean()
        .exec(),
      this.surveyModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.floor(skip / limit) + 1;

    return {
      data: data as unknown as Survey[],
      meta: {
        totalItems,
        itemsPerPage: limit,
        currentPage,
        totalPages,
      },
    };
  }

  async findOne(id: string, userCampuses: Types.ObjectId[]): Promise<Survey> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      isDeleted: false,
    };

    const survey = await this.surveyModel
      .findOne(filter)
      .populate('campuses', 'name')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    return survey;
  }

  async update(
    id: string,
    updateSurveyDto: UpdateSurveyDto,
    user: AuthenticatedUser,
  ): Promise<Survey> {
    const survey = await this.surveyModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    this.ensureUserCanAccessSurvey(survey, user);

    if (updateSurveyDto.title !== undefined) {
      survey.title = updateSurveyDto.title.trim();
    }

    if (updateSurveyDto.campusIds !== undefined) {
      survey.campuses = this.mapCampusIds(updateSurveyDto.campusIds);
    }

    if (updateSurveyDto.date !== undefined) {
      survey.scheduledDate = updateSurveyDto.date
        ? new Date(updateSurveyDto.date)
        : undefined;
    }

    if (updateSurveyDto.category !== undefined) {
      survey.category = updateSurveyDto.category?.trim();
    }

    if (updateSurveyDto.feedbackActioned !== undefined) {
      survey.feedbackActioned = updateSurveyDto.feedbackActioned;
    }

    if (updateSurveyDto.status !== undefined) {
      survey.status = updateSurveyDto.status;
    }

    if (updateSurveyDto.surveyQuestions !== undefined) {
      survey.surveyQuestions = this.transformSurveyQuestions(
        updateSurveyDto.surveyQuestions,
      ) as SurveyCategory[];
    }

    const updatedSurvey = await survey.save();

    try {
      const campusIds = (updatedSurvey.campuses || [])
        .map((campus: any) => {
          if (campus instanceof Types.ObjectId) {
            return campus.toString();
          }
          if (campus && typeof campus === 'object' && campus._id) {
            return campus._id.toString();
          }
          return campus ? String(campus) : undefined;
        })
        .filter((id): id is string => Boolean(id));

      const wasStatusUpdated = updateSurveyDto.status !== undefined && 
                              updateSurveyDto.status === SurveyStatus.PUBLISH;
      
      if (updatedSurvey.status === SurveyStatus.PUBLISH && 
          (wasStatusUpdated || updateSurveyDto.campusIds !== undefined)) {
        if (campusIds.length === 0) {
          // For all campuses, skip campus-based notifications
        } else {
          for (const campusId of campusIds) {
            try {
              await this.notificationsService.sendByCampus(
                campusId,
                wasStatusUpdated ? 'New Survey Available' : 'Survey Updated',
                `${updatedSurvey.title} - Please share your feedback!`,
                {
                  refModel: 'Survey',
                  relatedEntityId: updatedSurvey._id.toString(),
                  event: wasStatusUpdated ? 'created' : 'updated',
                  meta: { url: `/survey/${updatedSurvey._id.toString()}` },
                  recipientRole: 'parent',
                }
              );
            } catch (notificationError) {
              console.error(`Failed to send notifications for campus ${campusId}:`, notificationError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send survey update notifications:', error);
    }

    return updatedSurvey;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const survey = await this.surveyModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    this.ensureUserCanAccessSurvey(survey, user);

    survey.isDeleted = true;
    await survey.save();

    // Feed updates handled by AutoFeed interceptor
  }

  private transformSurveyQuestions(
    categories: SurveyCategoryDto[],
  ): SurveyCategory[] {
    return categories.map((category) => {
      if (!category.questions.length) {
        throw new BadRequestException(
          `Category "${category.categoryName}" must contain at least one question`,
        );
      }

      return {
        categoryName: category.categoryName.trim(),
        questions: category.questions.map((question) => ({
          question: question.question.trim(),
          type: question.type,
          options: this.normaliseOptions(question.type, question.options),
        })),
      };
    });
  }

  private normaliseOptions(
    type: SurveyQuestionType,
    options?: string[],
  ): string[] {
    if (!OPTION_BASED_TYPES.has(type)) {
      return [];
    }

    if (!options || !options.length) {
      throw new BadRequestException(
        'Options are required for multiple-choice and dropdown questions',
      );
    }

    const sanitized = options
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    if (!sanitized.length) {
      throw new BadRequestException(
        'Options are required for multiple-choice and dropdown questions',
      );
    }

    return Array.from(new Set(sanitized));
  }

  private mapCampusIds(campusIds?: string[]): Types.ObjectId[] {
    if (!campusIds || campusIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(campusIds));
    return uniqueIds.map((id) => new Types.ObjectId(id));
  }

  private buildCampusRestriction(
    user: AuthenticatedUser,
  ): FilterQuery<SurveyDocument> | null {
    if (!user) {
      return null;
    }

    if (
      user.role === UserRole.ADMINISTRATOR ||
      user.role === UserRole.AREA_MANAGER ||
      user.accessScope === AccessScope.ALL
    ) {
      return null;
    }

    const campuses = this.extractUserCampuses(user);

    if (!campuses.length) {
      return {
        $or: [
          { campuses: { $exists: false } },
          { campuses: { $size: 0 } },
        ],
      };
    }

    return {
      $or: [
        { campuses: { $in: campuses } },
        { campuses: { $exists: false } },
        { campuses: { $size: 0 } },
      ],
    };
  }

  private extractUserCampuses(user: AuthenticatedUser): Types.ObjectId[] {
    if (!user.campuses || user.campuses.length === 0) {
      return [];
    }

    const unique = Array.from(new Set(user.campuses.map((id) => id.toString())));
    return unique.map((id) => new Types.ObjectId(id));
  }

  private ensureUserCanAccessSurvey(
    survey: SurveyDocument,
    user: AuthenticatedUser,
  ): void {
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (
      user.role === UserRole.ADMINISTRATOR ||
      user.role === UserRole.AREA_MANAGER ||
      user.accessScope === AccessScope.ALL
    ) {
      return;
    }

    const userCampuses = this.extractUserCampuses(user);

    if (!survey.campuses || survey.campuses.length === 0) {
      return;
    }

    const surveyCampuses = survey.campuses.map((campus) => String(campus));

    const hasAccess = userCampuses
      .map((campus) => campus.toString())
      .some((campusId) => surveyCampuses.includes(campusId));

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this survey');
    }
  }
}
