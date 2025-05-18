import { Controller } from '@nestjs/common';
import { UsersService } from '../../users/service/users.service';

@Controller('users') // 기본 경로 '/users'
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}