import { EventStatus } from '../enums/event-status.enum';

export interface Event {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  conditions: string;
  status: EventStatus;
}