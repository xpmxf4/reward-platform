import { Module } from '@nestjs/common';
import { EventProxyController } from './event-proxy.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [EventProxyController],
})
export class EventProxyModule {}