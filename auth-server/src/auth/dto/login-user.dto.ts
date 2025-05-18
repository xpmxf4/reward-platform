import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '사용자명은 필수 항목입니다.' })
  username: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수 항목입니다.' })
  password: string;
}