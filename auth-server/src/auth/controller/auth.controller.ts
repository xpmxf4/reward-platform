import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request as NestRequest, Get } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserDocument } from '../../users/schemas/user.schema';
import { LocalAuthGuard } from '../guard/local-auth.guard';
import { LoginUserDto } from '../dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto): Promise<Omit<UserDocument, 'password'>> {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@NestRequest() req, @Body() loginUserDto: LoginUserDto ): Promise<{ accessToken: string }> {
    return this.authService.login(req.user as Pick<UserDocument, 'username' | '_id' | 'roles'>);
  }
}