import { Module } from '@nestjs/common';
import { EventClaimProxyController } from './event-claim-proxy.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [EventClaimProxyController],
})
export class EventClaimProxyModule {}