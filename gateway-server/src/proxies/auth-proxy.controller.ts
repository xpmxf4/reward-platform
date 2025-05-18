import { HttpService } from '@nestjs/axios';
import { Get, Query } from '@nestjs/common';

export class AuthProxyController {
  constructor(private readonly httpService: HttpService) {
  }

  @Get('auth/login')
  async login(@Query() query: any){
    return 'hello';
  }
}