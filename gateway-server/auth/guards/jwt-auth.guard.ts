import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-gateway') { // JwtStrategy에서 지정한 이름 사용
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.debug('Gateway JwtAuthGuard canActivate called');
    return super.canActivate(context);
  }

  handleRequest(err, user, info: Error, context: ExecutionContext, status?: any) {
    if (info) {
      this.logger.warn(`Gateway JWT Authentication Error: ${info.name} - ${info.message}`);
    }
    if (err || !user) {
      const errorMessage = info instanceof Error ? info.message : '유효한 인증 토큰이 필요합니다 (Gateway).';
      throw err || new UnauthorizedException(errorMessage);
    }
    this.logger.debug(`Gateway JWT Authentication Successful for user: ${user.username}`);
    return user; // JwtStrategy의 validate가 반환한 페이로드
  }
}