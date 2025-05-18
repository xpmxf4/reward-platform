import { Controller } from '@nestjs/common';
import { AuthService } from '../service/auth.service';

@Controller('auth') // 기본 경로 '/users'
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}