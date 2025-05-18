import { Module } from '@nestjs/common';
import { AuthProxyController } from './auth-proxy.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../auth/strategy/jwt.strategy';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt-gateway' }), // PassportModule 등록
  ],
  controllers: [AuthProxyController],
  providers: [JwtStrategy], // JwtStrategy를 provider로 등록
})
export class AuthProxyModule {}