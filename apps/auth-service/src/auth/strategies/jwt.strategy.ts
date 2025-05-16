import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret'),
    });
  }

  /**
   * JWT 전략 검증 메서드
   *
   * @param payload JWT 페이로드
   * @returns 검증된 사용자 정보
   */
  async validate(payload: any) {
    // 페이로드에서 사용자 정보 추출
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    };
  }
}