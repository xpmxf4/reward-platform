import { IsString, IsNotEmpty, IsDateString, IsObject, ValidateNested, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRewardDto } from './reward.dto'; // Reward DTO 임포트

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: '이벤트 이름은 필수입니다.' })
  eventName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString({}, { message: '유효한 날짜 형식이 아닙니다 (ISO8601).' })
  @IsNotEmpty({ message: '이벤트 시작일은 필수입니다.' })
  startDate: string; // ISO8601 형식의 날짜 문자열 (예: "2025-06-01T00:00:00Z")

  @IsDateString({}, { message: '유효한 날짜 형식이 아닙니다 (ISO8601).' })
  @IsNotEmpty({ message: '이벤트 종료일은 필수입니다.' })
  endDate: string;

  @IsObject({ message: '이벤트 조건은 객체여야 합니다.' })
  @IsNotEmpty({ message: '이벤트 조건은 필수입니다.' })
  conditions: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true }) // 배열의 각 요소에 대해 유효성 검사
  @Type(() => CreateRewardDto) // 배열 요소의 타입을 명시
  @IsOptional() // 보상은 없을 수도 있음
      // @ArrayMinSize(1, { message: '최소 하나 이상의 보상이 필요합니다.' }) // 필요하다면 이 옵션 사용
  rewards?: CreateRewardDto[];
}