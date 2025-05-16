// apps/auth-service/src/auth/services/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { KafkaService } from '@app/shared';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly kafkaService: KafkaService,
  ) {}

  /**
   * 사용자 인증
   *
   * @param username 사용자명
   * @param password 비밀번호
   * @returns 인증된 사용자 정보 (비밀번호 제외)
   */
  async validateUser(username: string, password: string): Promise<any> {
    try {
      // 사용자 정보 조회 (비밀번호 포함)
      const user = await this.usersService.findByUsername(username);

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        // 비밀번호 필드를 제외한 사용자 정보 반환
        const { password, ...result } = user.toObject();
        return result;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 로그인 처리
   *
   * @param loginDto 로그인 정보
   * @returns JWT 토큰 및 사용자 정보
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // JWT 페이로드
    const payload = {
      sub: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    // 로그인 이벤트 발행
    await this.kafkaService.produce('user-logged-in', {
      userId: user._id.toString(),
      timestamp: new Date().toISOString(),
    });

    // JWT 토큰 및 사용자 정보 반환
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  /**
   * JWT 토큰 검증
   *
   * @param token JWT 토큰
   * @returns 검증 결과 (페이로드)
   */
  async validateToken(token: string) {
    try {
      // JWT 토큰 검증
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * 회원가입 메소드 추가
   *
   * @param createUserDto 사용자 생성 정보
   * @returns 생성된 사용자 정보
   */
  async register(createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}