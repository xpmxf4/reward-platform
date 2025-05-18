import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.debug('JwtAuthGuard canActivate called');
    return super.canActivate(context);
  }

  handleRequest(err, user, info: Error, context: ExecutionContext, status?: any) {
    if (info) {
      this.logger.warn(`JWT Authentication Error: ${info.name} - ${info.message}`);
    }
    if (err || !user) {
      const errorMessage = info instanceof Error ? info.message : '유효한 인증 토큰이 필요합니다.';
      throw err || new UnauthorizedException(errorMessage);
    }
    this.logger.debug(`JWT Authentication Successful for user: ${user.username}`);
    return user;
  }
}