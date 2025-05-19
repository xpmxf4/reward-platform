import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Reward, RewardSchema } from '../../events/schemas/reward.schema';

export type UserRewardRequestDocument = UserRewardRequest & Document;

@Schema({ _id: false }) // 서브다큐먼트용
class ProcessedRewardInfo {
  @Prop({ type: RewardSchema, required: true })
  rewardDetailsSnapshot: Reward; // Reward 타입으로 변경 (스키마 직접 사용)

  @Prop({
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK'],
    required: true,
  })
  grantStatus: string;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: Date })
  processedAt?: Date;
}
const ProcessedRewardInfoSchema =
  SchemaFactory.createForClass(ProcessedRewardInfo);

@Schema({ timestamps: true, versionKey: false })
export class UserRewardRequest {
  @Prop({ required: true, unique: true, index: true })
  requestId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId: Types.ObjectId;

  @Prop({ type: SchemaTypes.Mixed })
  eventSnapshot?: Record<string, any>;

  @Prop({
    type: String,
    required: true,
    enum: [
      'PENDING_VALIDATION',
      'VALIDATION_FAILED_USER_INACTIVE',
      'VALIDATION_FAILED_EVENT_NOT_ACTIVE',
      'VALIDATION_FAILED_ALREADY_CLAIMED',
      'PENDING_CONDITION_CHECK',
      'CONDITION_CHECK_FAILED_EXTERNAL',
      'CONDITION_NOT_MET',
      'PENDING_INVENTORY_ALLOCATION',
      'INVENTORY_ALLOCATION_FAILED_OUT_OF_STOCK',
      'INVENTORY_ALLOCATION_FAILED_CONCURRENCY',
      'INVENTORY_ALLOCATION_ERROR',
      'INVENTORY_ALLOCATED',
      'PENDING_REWARD_GRANT',
      'REWARD_GRANT_FAILED_EXTERNAL',
      'REWARD_GRANT_FAILED_USER_INACTIVE',
      'REWARD_PARTIALLY_GRANTED',
      'SUCCESS_ALL_GRANTED',
      'PENDING_COMPENSATION_INVENTORY',
      'COMPENSATED_INVENTORY',
      'PENDING_COMPENSATION_REWARD',
      'COMPENSATED_REWARD',
      'FAILED_ROLLED_BACK',
      'COMPENSATION_FAILED_MANUAL_INTERVENTION_REQUIRED',
    ],
    default: 'PENDING_VALIDATION',
    index: true,
  })
  status: string;

  @Prop({ type: String })
  currentSagaStep?: string;

  @Prop({ type: [ProcessedRewardInfoSchema], default: [] })
  processedRewards: Types.DocumentArray<ProcessedRewardInfo>;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: Number, default: 0 })
  retryCount?: number;

  @Prop({ type: [Object] })
  compensatingActionsLog?: Record<string, any>[];

  @Prop({ type: Date })
  rewardsGrantedAt?: Date;
}

export const UserRewardRequestSchema =
  SchemaFactory.createForClass(UserRewardRequest);

UserRewardRequestSchema.index(
  { userId: 1, eventId: 1, requestId: 1 },
  { unique: true },
);
UserRewardRequestSchema.index({ status: 1, createdAt: 1 });