import { Injectable, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { UsersService } from '../../users/service/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserDocument } from '../../users/schemas/user.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<Omit<UserDocument, 'password'>> {
    try {
      const user = await this.usersService.create(createUserDto);
      const result = user.toObject();
      delete result.password;
      return result as Omit<UserDocument, 'password'>;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message); // UsersService에서 오는 메시지 사용
      }
      this.logger.error(`Registration error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('사용자 등록 중 오류가 발생했습니다.');
    }
  }

  async validateUser(username: string, pass: string): Promise<Omit<UserDocument, 'password'> | null> {
    const user = await this.usersService.findOneByUsername(username);
    if (user && (await user.comparePassword(pass))) {
      const result = user.toObject();
      delete result.password;
      return result as Omit<UserDocument, 'password'>;
    }
    return null;
  }

  async login(userFromRequest: Pick<UserDocument, 'username' | '_id' | 'roles'>): Promise<{ accessToken: string }> {
    const payload = {
      username: userFromRequest.username,
      sub: (userFromRequest._id as any).toHexString(),
      roles: userFromRequest.roles
    };

    if (!payload.sub) {
      this.logger.error('User ID (sub) is missing in payload for JWT generation', userFromRequest);
      throw new InternalServerErrorException('로그인 처리 중 오류가 발생했습니다.');
    }

    try {
      return {
        accessToken: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`JWT sign error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('로그인 토큰 생성 중 오류가 발생했습니다.');
    }
  }
}