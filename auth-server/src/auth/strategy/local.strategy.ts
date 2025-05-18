import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'username', passwordField: 'password' });
  }

  async validate(username: string, pass: string): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.authService.validateUser(username, pass);
    if (!user) {
      throw new UnauthorizedException('로그인 정보가 올바르지 않습니다.');
    }
    return user;
  }
}