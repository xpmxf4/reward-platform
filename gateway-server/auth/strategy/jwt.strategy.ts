import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtGatewayPayload {
  username: string;
  sub: string; // userId
  roles: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-gateway') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      const errorMessage = 'FATAL ERROR: JWT_SECRET is not defined in Gateway environment variables.';
      throw new Error(errorMessage);
    }

    // 옵션 객체를 명시적으로 생성
    const strategyOptions: StrategyOptions = { // passport-jwt에서 가져온 StrategyOptions 사용
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false, // 명시적으로 false 설정
    };

    super(strategyOptions); // 타입이 일치하는지 확인

    this.logger = new Logger(JwtStrategy.name);
    this.logger.log('JwtStrategy initialized.');
  }

  async validate(payload: JwtGatewayPayload): Promise<JwtGatewayPayload> {
    this.logger.debug(`Gateway JwtStrategy validated payload for user: ${payload.username} (ID: ${payload.sub})`);
    return payload; // 페이로드 자체가 req.user에 담김
  }
}