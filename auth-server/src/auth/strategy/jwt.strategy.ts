import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/service/users.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

export interface JwtPayload {
  username: string;
  sub: string; // userId를 여기에 담음
  roles: string[];
  iat?: number; // Issued at (자동 생성됨)
  exp?: number; // Expiration time (자동 생성됨)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // 'jwt'는 기본 전략 이름
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService, // 사용자 DB 조회 위해 주입
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret
    });
    this.logger.log(`JWT_SECRET used in JwtStrategy: ${configService.get<string>('JWT_SECRET') ? 'Loaded' : 'NOT LOADED'}`);
  }

  async validate(payload: JwtPayload): Promise<Omit<UserDocument, 'password'> & { userId: string }> {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    const user = await this.usersService.findOneById(payload.sub);
    if (!user || !user.isActive) {
      this.logger.warn(`JWT validation failed: User not found or inactive for userId ${payload.sub}`);
      throw new UnauthorizedException('유효하지 않은 토큰이거나 사용자가 비활성 상태입니다.');
    }

    const { password, ...result } = user.toObject();

    return {
      ...result, // DB에서 가져온 사용자 정보 (비밀번호 제외)
      userId: payload.sub, // JWT 페이로드의 userId (확인차)
      username: payload.username, // JWT 페이로드의 username
      roles: payload.roles, // JWT 페이로드의 roles
    };
  }
}