import {IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min,} from 'class-validator';

// 보상 타입 Enum (스키마와 일치)
export enum RewardTypeEnum {
  POINT = 'POINT',
  ITEM = 'ITEM',
  COUPON = 'COUPON',
  VIRTUAL_CURRENCY = 'VIRTUAL_CURRENCY',
}

export class CreateRewardDto {
  @IsOptional() 
  @IsMongoId({message: '유효한 보상 ID가 아닙니다.'})
  _id?: string; 

  @IsEnum(RewardTypeEnum, { message: '유효한 보상 타입이 아닙니다.' })
  @IsNotEmpty({ message: '보상 타입은 필수입니다.' })
  rewardType: RewardTypeEnum;

  @IsString()
  @IsNotEmpty({ message: '보상 이름은 필수입니다.' })
  rewardName: string;

  @IsObject({ message: '보상 세부 정보는 객체여야 합니다.' })
  @IsNotEmpty({ message: '보상 세부 정보는 필수입니다.' })
  details: Record<string, any>;

  @IsNumber({}, {message: "사용자당 지급 수량은 숫자여야 합니다."})
  @Min(1, {message: "사용자당 지급 수량은 최소 1 이상이어야 합니다."})
  @IsNotEmpty({ message: '사용자당 지급 수량은 필수입니다.' })
  quantityPerUser: number;

  @IsOptional()
  @IsNumber({}, {message: "총 재고는 숫자여야 합니다."})
  @Min(-1, {message: "총 재고는 -1(무제한) 또는 0 이상이어야 합니다."}) // -1은 무제한
  totalStock?: number;

}