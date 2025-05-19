import { All, Controller, Req, Res, Logger, HttpStatus, Injectable, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

interface AuthenticatedUserInGateway {
  userId: string;
  username: string;
  roles: string[];
  // 필요시 iat, exp 등 추가
}

interface RequestWithAuthenticatedUser extends Request {
  user?: AuthenticatedUserInGateway;
}


@Controller('/api/events') // Gateway에서 /api/events 경로로 들어오는 모든 요청을 처리
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

  @UseGuards(JwtAuthGuard)
  @All('*')
  async proxyToEventService(@Req() req: RequestWithAuthenticatedUser, @Res() res: Response) {
    const { method, originalUrl, body, headers: clientHeaders, user } = req;

    const targetPath = originalUrl.replace('/api/events', '');
    const targetUrl = `${this.eventServiceUrl}/events${targetPath}`; // Event Service의 실제 URL


    const headersToForward: Record<string, string> = {};
    if (clientHeaders['content-type']) {
      headersToForward['content-type'] = clientHeaders['content-type'] as string;
    }
    if (clientHeaders['accept']) {
      headersToForward['accept'] = clientHeaders['accept'] as string;
    }
    if (user) {
      headersToForward['X-User-ID'] = user.userId;
      headersToForward['X-User-Roles'] = user.roles.join(','); // 역할을 쉼표로 구분된 문자열로 전달
      headersToForward['X-User-Name'] = user.username;
    }
    if (clientHeaders['x-forwarded-for']) {
      headersToForward['x-forwarded-for'] = clientHeaders['x-forwarded-for'] as string;
    } else if (req.socket.remoteAddress) {
      headersToForward['x-forwarded-for'] = req.socket.remoteAddress;
    }

    if (clientHeaders['x-idempotency-key']) {
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
          res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: `Event service is currently unavailable or not responding.`,
            error: "Service Unavailable"
          });
        } else {
          this.logger.error(
            `Error setting up request to Event Service (${targetUrl}): ${axiosError.message}`,
          );
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error connecting to the event service.',
            error: "Internal Server Error"
          });
        }
      } else {
        this.logger.error(
          `Unexpected error while proxying to Event Service (${targetUrl}): ${error.message}`,
        );
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal Gateway Error.',
          error: "Internal Server Error"
        });
      }
    }
  }
}