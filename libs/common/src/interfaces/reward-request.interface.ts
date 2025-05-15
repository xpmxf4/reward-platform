import { RewardRequestStatus } from '../enums/reward-request-status.enum';

export interface RewardRequest {
  id: string;
  userId: string;
  eventId: string;
  rewardId: string;
  requestDate: Date;
  status: RewardRequestStatus;
  completedDate?: Date;
}