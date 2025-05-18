import { All, Controller, Req, Res, Logger, HttpStatus, UseGuards, Get, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('/api/auth')
export class AuthProxyController {
  private readonly logger = new Logger(AuthProxyController.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const urlFromEnv = this.configService.get<string>('AUTH_SERVICE_URL');
    if (!urlFromEnv) {
      const errorMessage = 'CRITICAL ERROR: AUTH_SERVICE_URL is not defined in environment variables. Gateway cannot start proxying to Auth Service.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    this.authServiceUrl = urlFromEnv;
    this.logger.log(`Auth Service URL initialized to: ${this.authServiceUrl}`);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async proxyProfile(@Req() req: Request, @Res() res: Response) {
    this.logger.log(`Gateway: Authenticated user for profile: ${JSON.stringify(req.user)}`);
    await this.proxyToAuthService(req, res); // 기존 프록시 로직 호출
  }

  @Post('login')
  async proxyLogin(@Req() req: Request, @Res() res: Response) {
    await this.proxyToAuthService(req, res);
  }

  @Post('register')
  async proxyRegister(@Req() req: Request, @Res() res: Response) {
    await this.proxyToAuthService(req, res);
  }


  @All('*')
  async proxyToAuthService(@Req() req: Request, @Res() res: Response) {
    const { method, originalUrl, body, headers: clientHeaders } = req;
    let targetPath = originalUrl.replace('/api/auth', '');
    const targetUrl = `${this.authServiceUrl}/auth${targetPath}`; // ★★★ 변수 제대로 사용 ★★★

    this.logger.log(`Original URL: ${originalUrl}`);
    this.logger.log(`Target Path: ${targetPath}`);
    this.logger.log(`Calculated Target URL for Axios: ${targetUrl}`); // ★★★ 올바른 로깅 ★★★
    this.logger.log(`Proxying request: ${method} ${targetUrl}`); // ★★★ 올바른 로깅 ★★★
    this.logger.log(`Proxying request: ${method} ${targetUrl}`);
    if (Object.keys(body).length > 0) { // 본문이 있을 경우에만 로그 기록 (GET 요청 등은 본문 없음)
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);
    }


    const headersToForward: Record<string, string> = {};
    if (clientHeaders['content-type']) {
      headersToForward['content-type'] = clientHeaders['content-type'] as string;
    }
    if (clientHeaders['accept']) {
      headersToForward['accept'] = clientHeaders['accept'] as string;
    }
    if (clientHeaders['authorization']) {
      headersToForward['authorization'] = clientHeaders['authorization'] as string;
    }
    if (clientHeaders['x-forwarded-for']) {
      headersToForward['x-forwarded-for'] = clientHeaders['x-forwarded-for'] as string;
    } else if (req.socket.remoteAddress) {
      headersToForward['x-forwarded-for'] = req.socket.remoteAddress;
    }


    try {
      const serviceResponse: AxiosResponse = await firstValueFrom(
        this.httpService
          .request({
            method: method as any, // 'GET', 'POST', 'PUT', 'DELETE' 등
            url: targetUrl,
            data: body,
            headers: headersToForward,
          })
          .pipe(
            map((axiosResponse) => {
              this.logger.log(`Received response from Auth Service (${targetUrl}): Status ${axiosResponse.status}`);
              return axiosResponse;
            }),
            catchError((error: AxiosError<any>) => {
              this.logger.error(
                `Axios error while proxying to ${targetUrl}: ${error.message}`,
                error.stack
              );
              return throwError(() => error);
            }),
          ),
      );
      res.status(serviceResponse.status).json(serviceResponse.data);
    } catch (error) {
      if (error instanceof AxiosError) { // AxiosError 타입인지 확인
        const axiosError = error as AxiosError<any>; // 타입 단언
        if (axiosError.response) {
          // 백엔드 서비스가 오류 응답을 반환한 경우
          this.logger.warn(
            `Auth Service (${targetUrl}) responded with error: Status ${axiosError.response.status}, Data: ${JSON.stringify(axiosError.response.data)}`,
          );
          res.status(axiosError.response.status).json(axiosError.response.data);
        } else if (axiosError.request) {
          this.logger.error(
            `No response received from Auth Service (${targetUrl}). Error: ${axiosError.message}`,
          );
          res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: `Authentication service is currently unavailable or not responding.`,
            error: "Service Unavailable"
          });
        } else {
          this.logger.error(
            `Error setting up request to Auth Service (${targetUrl}): ${axiosError.message}`,
          );
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error connecting to the authentication service.',
            error: "Internal Server Error"
          });
        }
      } else {
        this.logger.error(
          `Unexpected error while proxying to Auth Service (${targetUrl}): ${error.message}`,
          error.stack,
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