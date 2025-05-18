import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '사용자명은 필수 항목입니다.' })
  @MinLength(4, { message: '사용자명은 최소 4자 이상이어야 합니다.' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: '사용자명은 영문자와 숫자만 사용할 수 있습니다.',
  })
  username: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수 항목입니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password: string;

  @IsOptional()
  @IsArray({ message: '역할은 배열이어야 합니다.' })
  @ArrayNotEmpty({
    message: '역할 배열은 비어있을 수 없습니다 (하나 이상의 역할 필요 시).',
  })
  @IsIn(['USER', 'OPERATOR', 'AUDITOR', 'ADMIN'], {
    each: true,
    message: '유효하지 않은 역할입니다.',
  })
  roles?: string[];
}
