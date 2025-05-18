import { Module } from '@nestjs/common';
import { AuthProxyController } from './auth-proxy.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [AuthProxyController],
})
export class AuthProxyModule {}