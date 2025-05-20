import {
  All,
  Controller,
  Req,
  Res,
  Logger,
  HttpStatus,
  UseGuards,
  Param,
  Post,
  Get,
  Patch,
  Put,
  Delete,
} from '@nestjs/common'; // 필요한 메소드 임포트
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // 경로 확인!

interface AuthenticatedUserInGateway {
  userId: string;
  username: string;
  roles: string[];
}

interface RequestWithAuthenticatedUser extends Request {
  user?: AuthenticatedUserInGateway;
}

@Controller('/api/event-claims') // ★★★ 경로 변경 ★★★
@UseGuards(JwtAuthGuard) // 이 컨트롤러의 모든 API는 기본적으로 JWT 인증 요구
export class EventClaimProxyController {
  private readonly logger = new Logger(EventClaimProxyController.name);
  private readonly eventServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const urlFromEnv = this.configService.get<string>('EVENT_SERVICE_URL');
    if (!urlFromEnv) {
      const errorMessage =
        'CRITICAL ERROR: EVENT_SERVICE_URL is not defined...';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    this.eventServiceUrl = urlFromEnv;
    this.logger.log(
      `Event Service URL for EventClaimProxy initialized to: ${this.eventServiceUrl}`,
    );
  }

  // POST /api/event-claims/:eventId/claim
  @Post(':eventId/claim')
  async proxyClaimReward(
    @Param('eventId') eventId: string,
    @Req() req: RequestWithAuthenticatedUser,
    @Res() res: Response,
  ) {
    this.logger.log(
      `EventClaimProxy: POST request for ${req.originalUrl} (Claim Reward)`,
    );
    await this.commonEventClaimProxyLogic(req, res);
  }

  // GET /api/event-claims/me (예시: 사용자 본인 요청 내역)
  @Get('me')
  async proxyGetMyClaims(
    @Req() req: RequestWithAuthenticatedUser,
    @Res() res: Response,
  ) {
    this.logger.log(
      `EventClaimProxy: GET request for ${req.originalUrl} (My Claims)`,
    );
    await this.commonEventClaimProxyLogic(req, res);
  }

  // GET /api/event-claims/user/:userId (예시: 관리자용 특정 사용자 요청 내역)
  @Get('user/:userId')
  async proxyGetUserClaims(
    @Param('userId') userId: string,
    @Req() req: RequestWithAuthenticatedUser,
    @Res() res: Response,
  ) {
    this.logger.log(
      `EventClaimProxy: GET request for ${req.originalUrl} (User Claims: ${userId})`,
    );
    await this.commonEventClaimProxyLogic(req, res);
  }

  // 기타 필요한 라우트 핸들러 추가 (예: GET /event-claims/{requestId})

  // 공통 프록시 로직
  private async commonEventClaimProxyLogic(
    @Req() req: RequestWithAuthenticatedUser,
    @Res() res: Response,
  ) {
    const { method, originalUrl, body, headers: clientHeaders, user } = req;
    const gatewayBasePath = '/api/event-claims'; // 이 컨트롤러의 기본 경로
    const servicePath = originalUrl.substring(gatewayBasePath.length); // 예: /:eventId/claim 또는 /me
    // Event Server의 EventClaimsController는 @Controller('event-claims') 이므로, /event-claims prefix
    const targetUrl = `<span class="math-inline">\{this\.eventServiceUrl\}/event\-claims</span>{servicePath}`;

    this.logger.log(
      `METHOD: ${method}, ORIGINAL_URL: ${originalUrl}, SERVICE_PATH: ${servicePath}, TARGET_URL: ${targetUrl}`,
    );

    // 헤더 설정 및 Axios 요청, 에러 처리는 이전 EventProxyController의 commonProxyLogic과 동일하게 구현
    const headersToForward: Record<string, string> = {};
    if (clientHeaders['content-type']) {
      headersToForward['content-type'] = clientHeaders[
        'content-type'
      ] as string;
    }
    if (clientHeaders['accept']) {
      headersToForward['accept'] = clientHeaders['accept'] as string;
    }
    if (user) {
      headersToForward['X-User-ID'] = user.userId;
      headersToForward['X-User-Roles'] = user.roles.join(',');
      headersToForward['X-User-Name'] = user.username;
    }
    if (clientHeaders['x-forwarded-for']) {
      headersToForward['x-forwarded-for'] = clientHeaders[
        'x-forwarded-for'
      ] as string;
    } else if (req.socket.remoteAddress) {
      headersToForward['x-forwarded-for'] = req.socket.remoteAddress;
    }
    if (clientHeaders['x-idempotency-key']) {
      headersToForward['x-idempotency-key'] = clientHeaders[
        'x-idempotency-key'
      ] as string;
    }

    try {
      const serviceResponse: AxiosResponse = await firstValueFrom(
        this.httpService
          .request({
            method: method as any,
            url: targetUrl,
            data: body,
            headers: headersToForward,
          })
          .pipe(
            map((axiosResponse) => {
              this.logger.log(
                `Received response from Event Service (EventClaim) (${targetUrl}): Status ${axiosResponse.status}`,
              );
              return axiosResponse;
            }),
            catchError((error: AxiosError<any>) => {
              this.logger.error(
                `Axios error while proxying to Event Service (EventClaim) ${targetUrl}: ${error.message}`,
              );
              return throwError(() => error);
            }),
          ),
      );
      res.status(serviceResponse.status).json(serviceResponse.data);
    } catch (error) {
      // ... (이전과 동일한 상세 Axios 에러 처리 로직) ...
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response) {
          this.logger.warn(
            `Event Service (EventClaim) (${targetUrl}) responded with error: Status ${axiosError.response.status}, Data: ${JSON.stringify(axiosError.response.data)}`,
          );
          res.status(axiosError.response.status).json(axiosError.response.data);
        } else if (axiosError.request) {
          this.logger.error(
            `No response from Event Service (EventClaim) (${targetUrl}). Error: ${axiosError.message}`,
          );
          res
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .json({
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              message: `Event service (claims) is currently unavailable.`,
              error: 'Service Unavailable',
            });
        } else {
          this.logger.error(
            `Error setting up request to Event Service (EventClaim) (${targetUrl}): ${axiosError.message}`,
          );
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'Error connecting to event service (claims).',
              error: 'Internal Server Error',
            });
        }
      } else {
        this.logger.error(
          `Unexpected error proxying to Event Service (EventClaim) (${targetUrl}): ${error.message}`,
        );
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal Gateway Error.',
            error: 'Internal Server Error',
          });
      }
    }
  }
}
