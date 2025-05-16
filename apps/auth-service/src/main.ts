import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HttpExceptionFilter } from '@app/shared';

async function bootstrap() {
  // HTTP 서버 생성
  const app = await NestFactory.create(AppModule);

  // 전역 파이프 설정 (DTO 검증)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // 전역 예외 필터 설정
  app.useGlobalFilters(new HttpExceptionFilter());

  // API 접두사 설정
  app.setGlobalPrefix('api');

  // Kafka 마이크로서비스 연결
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'auth-service',
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'auth-consumer',
      },
    },
  });

  // 마이크로서비스 시작
  await app.startAllMicroservices();
  console.log('Auth microservice is running');

  // HTTP 서버 시작
  await app.listen(3001);
  console.log(`Auth service is running on: ${await app.getUrl()}`);
}

bootstrap();