import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/service/users.service';
import { UserDocument } from '../../users/schemas/user.schema';

export interface JwtPayload {
  username: string;
  sub: string; // userId
  roles: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger: Logger;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      console.error('FATAL ERROR: JWT_SECRET is not defined...');
      throw new Error('FATAL ERROR: JWT_SECRET is not defined...');
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

  async validate(payload: JwtPayload): Promise<Omit<UserDocument, 'password'> & { userId: string }> {
    // ... validate 로직 ...
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);
    const user = await this.usersService.findOneById(payload.sub);
    if (!user || !user.isActive) {
      this.logger.warn(`JWT validation failed for userId ${payload.sub}`);
      throw new UnauthorizedException('유효하지 않은 토큰이거나 사용자가 비활성 상태입니다.');
    }
    const { password, ...result } = user.toObject();
    return {
      ...result,
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}