import { ResponseStatus } from "../schema/event-responce.schema";

export interface UpsertPayload {
    eventId: string;
    parentId: string;
    status: ResponseStatus;
    quantity?: number;
  }