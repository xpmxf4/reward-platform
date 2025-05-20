import { IsOptional, IsString, IsObject } from 'class-validator';

export class CreateEventClaimDto {
  @IsOptional()
  @IsString()
  notes?: string; // 예시: 사용자의 요청 관련 메모

  // 만약 요청 시점에 클라이언트가 특정 데이터를 함께 보내야 한다면 여기에 추가
  // @IsOptional()
  // @IsObject()
  // clientContext?: Record<string, any>;
}
