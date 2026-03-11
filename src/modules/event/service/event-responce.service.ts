import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventResponse, ResponseStatus } from '../schema/event-responce.schema';
import { UpsertPayload } from '../interface/event-responce.interface';


@Injectable()
export class EventResponseService {
  constructor(
    @InjectModel(EventResponse.name)
    private readonly eventResponseModel: Model<EventResponse>,
  ) {}

  async create(payload: UpsertPayload) {
    const { eventId, parentId, status } = payload;
    if (!eventId || !parentId || !status) {
      throw new BadRequestException('eventId, parentId and status are required');
    }

    const alreadyResponded = await this.hasAlreadyResponded(eventId, parentId);
    if (alreadyResponded) {
      throw new BadRequestException('You have already responded to this event.');
    }
  

    const insert: any = {
      eventId: new Types.ObjectId(eventId),
      parentId: new Types.ObjectId(parentId),
      status,
      isDeleted: false,
      quantity: 0,
    };

    if (status === ResponseStatus.GOING) {
      const quantityNumber = Number(payload.quantity ?? 1);
      if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
        throw new BadRequestException('Quantity must be a positive integer when status is going.');
      }
      insert.quantity = quantityNumber;
    }

    const doc = await this.eventResponseModel.create(insert);
    return doc.toObject();
  }

  async getTotals(eventId: string) {
    const oid = new Types.ObjectId(eventId);
    const pipeline = [
      { $match: { eventId: oid, isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          qty: { $sum: '$quantity' },
        },
      },
    ];

    const rows = await this.eventResponseModel.aggregate(pipeline).exec();
    const totals: any = {
      going: 0,
      maybe: 0,
      not_going: 0,
      no_answer: 0,
      totalGoingQuantity: 0,
    };
    for (const r of rows) {
      totals[r._id] = r.count;
      if (r._id === ResponseStatus.GOING) {
        totals.totalGoingQuantity = r.qty;
      }
    }
    return totals;
  }

  async findByEvent(eventId: string) {
    const oid = new Types.ObjectId(eventId);
    return this.eventResponseModel
      .find({ eventId: oid, isDeleted: false })
      .select('parentId status quantity createdAt updatedAt')
      .populate({ path: 'parentId', select: 'firstName lastName' })
      .lean()
      .exec();
  }

  async getSummary(eventId: string) {
    const oid = new Types.ObjectId(eventId);
    const result = await this.eventResponseModel
      .aggregate([
        { $match: { eventId: oid, isDeleted: false } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  going: {
                    $sum: { $cond: [{ $eq: ['$status', ResponseStatus.GOING] }, 1, 0] },
                  },
                  maybe: {
                    $sum: { $cond: [{ $eq: ['$status', ResponseStatus.MAYBE] }, 1, 0] },
                  },
                  not_going: {
                    $sum: { $cond: [{ $eq: ['$status', ResponseStatus.NOT_GOING] }, 1, 0] },
                  },
                  no_answer: {
                    $sum: { $cond: [{ $eq: ['$status', ResponseStatus.NO_ANSWER] }, 1, 0] },
                  },
                  totalGoingQuantity: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ResponseStatus.GOING] },
                        '$quantity',
                        0,
                      ],
                    },
                  },
                },
              },
              { $project: { _id: 0 } },
            ],
            responses: [
              {
                $lookup: {
                  from: 'users',
                  localField: 'parentId',
                  foreignField: '_id',
                  as: 'parent',
                },
              },
              { $unwind: { path: '$parent', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  parentId: 1,
                  status: 1,
                  quantity: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  'parent.firstName': 1,
                  'parent.lastName': 1,
                },
              },
            ],
          },
        },
      ])
      .exec();

    const first = Array.isArray(result) ? result[0] : null;
    const totals = (first && first.totals && first.totals[0]) || {
      going: 0,
      maybe: 0,
      not_going: 0,
      no_answer: 0,
      totalGoingQuantity: 0,
    };
    const responses = (first && first.responses) || [];
    return { totals, responses };
  }

  async findById(id: string) {
    const oid = new Types.ObjectId(id);
    return this.eventResponseModel
      .findOne({ _id: oid, isDeleted: false })
      .select('eventId parentId status quantity createdAt updatedAt')
      .populate({ path: 'parentId', select: 'firstName lastName' })
      .lean()
      .exec();
  }

  async update(payload: UpsertPayload) {
    const { eventId, parentId, status , quantity } = payload;
    if (!eventId || !parentId || !status) {
      throw new BadRequestException('eventId, parentId and status are required');
    }

    const filter = {
      eventId: new Types.ObjectId(eventId),
      parentId: new Types.ObjectId(parentId),
      isDeleted: false,
    };

    const updateDoc: any = { status };

    if (status === ResponseStatus.GOING) {
      const quantityNumber = Number(payload.quantity ?? 1);
      if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
        throw new BadRequestException('Quantity must be a positive integer when status is going.');
      }
      updateDoc.quantity = quantityNumber;
    } else {
      updateDoc.quantity = 0;
    }

    const doc = await this.eventResponseModel
      .findOneAndUpdate(filter, { $set: updateDoc }, { new: true })
      .lean()
      .exec();

    if (!doc) {
      throw new BadRequestException('No existing response found to update for this event.');
    }

    return doc;
  }

  async hasAlreadyResponded(eventId: string, parentId: string) {
    const existing = await this.eventResponseModel.findOne({
      eventId: new Types.ObjectId(eventId),
      parentId: new Types.ObjectId(parentId),
      isDeleted: false,
    }).lean().exec();
  
    return !!existing;
  }

  async checkIfResponded(eventId: string, parentId: string) {
    if (!eventId || !parentId) {
      throw new BadRequestException('eventId and parentId are required');
    }
  
    const response = await this.eventResponseModel
      .findOne({
        eventId: new Types.ObjectId(eventId),
        parentId: new Types.ObjectId(parentId),
        isDeleted: false,
      })
      .select('status quantity createdAt updatedAt')
      .populate({ path: 'parentId', select: 'firstName lastName' })
      .lean()
      .exec();
  
    if (!response) {
      // User has not responded yet
      return { hasResponded: false };
    }
  
    // User already responded — return their response
    return {
      hasResponded: true,
      response,
    };
  }
  
}


