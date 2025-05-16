import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { configuration } from '@app/shared';
import { KafkaModule } from '@app/shared';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 환경 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // MongoDB 연결 설정
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.auth.uri'),
      }),
    }),

    // Kafka 모듈
    KafkaModule.register({
      clientId: 'auth-service',
    }),

    // 기능 모듈
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}