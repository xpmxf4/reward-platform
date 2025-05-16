// apps/auth-service/src/auth/controllers/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    // UsersService 직접 의존성 제거
  ) {}

  /**
   * 로그인 엔드포인트 (HTTP)
   *
   * @param loginDto 로그인 정보
   * @returns JWT 토큰 및 사용자 정보
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 회원가입 엔드포인트 (HTTP)
   *
   * @param createUserDto 사용자 생성 정보
   * @returns 생성된 사용자 정보
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // AuthService를 통해 사용자 생성
    return this.authService.register(createUserDto);
  }

  /**
   * 사용자 프로필 조회 엔드포인트 (HTTP)
   * JWT 인증 필요
   *
   * @param req 요청 객체 (인증된 사용자 정보 포함)
   * @returns 인증된 사용자 정보
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  /**
   * 로그인 처리 (Kafka)
   *
   * @param loginDto 로그인 정보
   * @returns JWT 토큰 및 사용자 정보
   */
  @MessagePattern('login')
  handleLogin(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 회원가입 처리 (Kafka)
   *
   * @param createUserDto 사용자 생성 정보
   * @returns 생성된 사용자 정보
   */
  @MessagePattern('register')
  handleRegister(@Payload() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * JWT 토큰 검증 (Kafka)
   *
   * @param token JWT 토큰
   * @returns 검증 결과 (페이로드)
   */
  @MessagePattern('validate-token')
  validateToken(@Payload() token: string) {
    return this.authService.validateToken(token);
  }
}