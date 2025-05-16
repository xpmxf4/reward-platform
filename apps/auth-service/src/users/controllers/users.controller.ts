// apps/auth-service/src/users/controllers/users.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자 생성 엔드포인트 (HTTP)
   *
   * @param createUserDto 사용자 생성 정보
   * @returns 생성된 사용자 정보
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  /**
   * 모든 사용자 조회 엔드포인트 (HTTP)
   *
   * @returns 사용자 목록
   */
  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  /**
   * ID로 사용자 조회 엔드포인트 (HTTP)
   *
   * @param id 사용자 ID
   * @returns 조회된 사용자 정보
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  /**
   * 사용자 정보 수정 엔드포인트 (HTTP)
   *
   * @param id 사용자 ID
   * @param updateUserDto 수정할 사용자 정보
   * @returns 수정된 사용자 정보
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * 사용자 삭제 엔드포인트 (HTTP)
   *
   * @param id 사용자 ID
   */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  /**
   * ID로 사용자 조회 (Kafka)
   *
   * @param id 사용자 ID
   * @returns 조회된 사용자 정보
   */
  @MessagePattern('find-user-by-id')
  findUserById(@Payload() id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  /**
   * 사용자명으로 사용자 조회 (Kafka)
   *
   * @param username 사용자명
   * @returns 조회된 사용자 정보
   */
  @MessagePattern('find-user-by-username')
  findUserByUsername(@Payload() username: string): Promise<User> {
    return this.usersService.findByUsername(username);
  }
}