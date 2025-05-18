import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {MongooseModule} from "@nestjs/mongoose";
import { UsersModule } from './users/users.module';
import { UsersService } from './users/service/users.service';
import { UsersController } from './users/controller/users.controller';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/service/auth.service';
import { AuthController } from './auth/controller/auth.controller';

@Module({
  imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env'
      }),
      MongooseModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          uri: configService.get<string>('MONGODB_URI'),
        }),
        inject: [ConfigService],
      }),
      UsersModule,
      AuthModule
  ],
  controllers: [AppController, UsersController, AuthController],
  providers: [AppService, UsersService, AuthService],
})
export class AppModule {}
