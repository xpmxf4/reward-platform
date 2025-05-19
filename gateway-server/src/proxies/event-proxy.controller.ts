import { All, Controller, Req, Res, Logger, HttpStatus, UseGuards, Get, Post, Put, Patch, Delete, Param } from '@nestjs/common'; // Get, Post 등 필요한 모든 HTTP 메소드 데코레이터 임포트
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

@Controller('/api/events')
@UseGuards(JwtAuthGuard)
export class EventProxyController {
  private readonly logger = new Logger(EventProxyController.name);
  private readonly eventServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const urlFromEnv = this.configService.get<string>('EVENT_SERVICE_URL');
    if (!urlFromEnv) {
      const errorMessage = 'CRITICAL ERROR: EVENT_SERVICE_URL is not defined in environment variables. Gateway cannot proxy to Event Service.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    this.eventServiceUrl = urlFromEnv;
    this.logger.log(`Event Service URL initialized to: ${this.eventServiceUrl}`);
  }


  // POST /api/events
  @Post()
  async proxyCreateEvent(@Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: POST request for ${req.originalUrl} (Create Event)`);
    await this.commonProxyLogic(req, res);
  }

  // GET /api/events
  @Get()
  async proxyFindAllEvents(@Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: GET request for ${req.originalUrl} (Find All Events)`);
    await this.commonProxyLogic(req, res);
  }

  // GET /api/events/test-auth
  @Get('test-auth') // 특정 경로 핸들러
  async proxyTestAuth(@Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: GET request for ${req.originalUrl} (Test Auth)`);
    await this.commonProxyLogic(req, res);
  }

  // GET /api/events/:id
  @Get(':id')
  async proxyFindOneEvent(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: GET request for ${req.originalUrl} (Find One Event: ${id})`);
    await this.commonProxyLogic(req, res);
  }

  // PUT /api/events/:id
  @Put(':id')
  async proxyUpdateEvent(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: PUT request for ${req.originalUrl} (Update Event: ${id})`);
    await this.commonProxyLogic(req, res);
  }

  // PATCH /api/events/:id/status
  @Patch(':id/status')
  async proxyUpdateEventStatus(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: PATCH request for ${req.originalUrl} (Update Event Status: ${id})`);
    await this.commonProxyLogic(req, res);
  }

  // DELETE /api/events/:id
  @Delete(':id')
  async proxyRemoveEvent(@Param('id') id: string, @Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    this.logger.log(`EventProxy: DELETE request for ${req.originalUrl} (Remove Event: ${id})`);
    await this.commonProxyLogic(req, res);
  }

  private async commonProxyLogic(@Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    const { method, originalUrl, body, headers: clientHeaders, user } = req;
    const gatewayBasePath = '/api/events'; // 이 컨트롤러가 담당하는 기본 경로
    // servicePath는 originalUrl에서 gatewayBasePath를 제거한 나머지. 예: "/some-id", 또는 "" (루트 요청 시)
    const servicePath = originalUrl.substring(gatewayBasePath.length);
    // Event Server의 EventsController는 @Controller('events') 이므로, /events prefix를 붙여줌
    const targetUrl = `${this.eventServiceUrl}/events${servicePath}`;

    this.logger.log(`METHOD: ${method}, ORIGINAL_URL: ${originalUrl}, SERVICE_PATH: ${servicePath}, TARGET_URL: ${targetUrl}`);

    if (Object.keys(body).length > 0 && method !== 'GET' && method !== 'DELETE') { // GET, DELETE는 보통 body가 없음
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);
    }

    const headersToForward: Record<string, string> = {};
    if (clientHeaders['content-type']) {
      headersToForward['content-type'] = clientHeaders['content-type'] as string;
    }
    if (clientHeaders['accept']) {
      headersToForward['accept'] = clientHeaders['accept'] as string;
    }
    if (user) { // 인증된 사용자 정보 전달
      headersToForward['X-User-ID'] = user.userId;
      headersToForward['X-User-Roles'] = user.roles.join(',');
      headersToForward['X-User-Name'] = user.username;
    }
    if (clientHeaders['x-forwarded-for']) {
      headersToForward['x-forwarded-for'] = clientHeaders['x-forwarded-for'] as string;
    } else if (req.socket.remoteAddress) {
      headersToForward['x-forwarded-for'] = req.socket.remoteAddress;
    }
    if (clientHeaders['x-idempotency-key']) { // 멱등성 키 전달
      headersToForward['x-idempotency-key'] = clientHeaders['x-idempotency-key'] as string;
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
            this.logger.log(`Received response from Event Service (${targetUrl}): Status ${axiosResponse.status}`);
            return axiosResponse;
          }),
          catchError((error: AxiosError<any>) => {
            this.logger.error(
              `Axios error while proxying to ${targetUrl}: ${error.message}`,
            );
            return throwError(() => error);
          }),
        ),
      );
      // 응답 헤더도 필요한 경우 전달 가능
      // res.setHeader('Content-Type', serviceResponse.headers['content-type']);
      res.status(serviceResponse.status).json(serviceResponse.data);
    } catch (error) {
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response) {
          this.logger.warn(
            `Event Service (${targetUrl}) responded with error: Status ${axiosError.response.status}, Data: ${JSON.stringify(axiosError.response.data)}`,
          );
          res.status(axiosError.response.status).json(axiosError.response.data);
        } else if (axiosError.request) {
          this.logger.error(
            `No response received from Event Service (${targetUrl}). Error: ${axiosError.message}`,
          );
          res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: `Event service is currently unavailable or not responding.`, error: "Service Unavailable"});
        } else {
          this.logger.error(`Error setting up request to Event Service (${targetUrl}): ${axiosError.message}`);
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error connecting to the event service.', error: "Internal Server Error"});
        }
      } else {
        this.logger.error(`Unexpected error while proxying to Event Service (${targetUrl}): ${error.message}`);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Gateway Error.', error: "Internal Server Error"});
      }
    }
  }
}