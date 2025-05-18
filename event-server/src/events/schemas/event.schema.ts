import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Reward, RewardSchema } from './reward.schema'; // RewardSchema 임포트

export type EventDocument = Event & Document;

@Schema({ timestamps: true, versionKey: false })
export class Event {
  @Prop({ required: true, trim: true, index: true })
  eventName: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, type: Date }) // Date 타입 명시
  startDate: Date;

  @Prop({ required: true, type: Date }) // Date 타입 명시
  endDate: Date;

  // 이벤트 조건은 JSON 객체로 유연하게 저장
  // 예: {"type": "LOGIN_STREAK", "days": 7, "targetLevel": 30}
  // 예: {"type": "QUEST_CLEAR", "questIds": ["q1001", "q1002"], "mode": "ALL"}
  @Prop({ type: SchemaTypes.Mixed, required: true })
  conditions: Record<string, any>;

  @Prop({
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'ARCHIVED'],
    default: 'DRAFT',
    index: true,
  })
  status: string;

  @Prop({ type: [RewardSchema], default: [] })
  rewards: Types.DocumentArray<Reward>; // Mongoose의 DocumentArray 타입

  @Prop({ required: true }) // 이벤트를 생성한 운영자/관리자의 userId (Auth Server의 사용자 ID)
  createdBy: string;

  @Prop({ type: String }) // 선택적: 마지막 수정자
  updatedBy?: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.virtual('isCurrentlyActive').get(function (this: EventDocument) {
  const now = new Date();
  return (
    this.status === 'ACTIVE' && this.startDate <= now && this.endDate >= now
  );
});

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });
