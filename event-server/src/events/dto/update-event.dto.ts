import {IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString, ValidateNested,} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRewardDto } from './reward.dto';

export enum EventStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: '유효한 날짜 형식이 아닙니다 (ISO8601).' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '유효한 날짜 형식이 아닙니다 (ISO8601).' })
  endDate?: string;

  @IsOptional()
  @IsObject({ message: '이벤트 조건은 객체여야 합니다.' })
  conditions?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRewardDto)
  rewards?: CreateRewardDto[];

  @IsOptional()
  @IsEnum(EventStatusEnum, { message: '유효한 이벤트 상태가 아닙니다.' })
  status?: EventStatusEnum;
}