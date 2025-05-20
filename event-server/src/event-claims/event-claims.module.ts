import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventClaimsService } from './services/event-claims.service';
import { EventClaimsController } from './controllers/event-claims.controller';
import { UserRewardRequest, UserRewardRequestSchema } from './schemas/user-reward-request.schema';
import { Event, EventSchema } from '../events/schemas/event.schema'; // Event 스키마 임포트

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRewardRequest.name, schema: UserRewardRequestSchema },
      { name: Event.name, schema: EventSchema } // Event 모델도 사용하므로 여기서도 forFeature
    ]),
  ],
  controllers: [EventClaimsController],
  providers: [EventClaimsService],
  exports: [EventClaimsService], // 다른 모듈에서 이 서비스를 사용할 일이 있다면 export
})
export class EventClaimsModule {}