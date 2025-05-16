import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { KafkaService } from '@app/shared';

@Injectable()
export class UsersService {
  @InjectModel(User.name)
  private userModel: Model<UserDocument>;

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * 새 사용자 생성
   *
   * @param createUserDto 사용자 생성 정보
   * @returns 생성된 사용자 정보
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 이미 존재하는 사용자 확인 (username 또는 email로 검색)
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    }).exec();

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 새 사용자 생성
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // 사용자 생성 이벤트 발행
    await this.kafkaService.produce('user-created', {
      id: savedUser._id.toString(),
      username: savedUser.username,
      email: savedUser.email,
      roles: savedUser.roles,
    });

    // 저장된 사용자 정보 반환 (비밀번호 제외)
    return savedUser;
  }

  /**
   * 모든 사용자 조회
   *
   * @returns 사용자 목록
   */
  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  /**
   * ID로 사용자 조회
   *
   * @param id 사용자 ID
   * @returns 조회된 사용자 정보
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  /**
   * 사용자명으로 사용자 조회 (인증용)
   *
   * @param username 사용자명
   * @returns 조회된 사용자 정보 (비밀번호 포함)
   */
  async findByUsername(username: string): Promise<User> {
    const user = await this.userModel.findOne({ username }).exec();

    if (!user) {
      throw new NotFoundException(`User with username "${username}" not found`);
    }

    return user;
  }

  /**
   * 사용자 정보 수정
   *
   * @param id 사용자 ID
   * @param updateUserDto 수정할 사용자 정보
   * @returns 수정된 사용자 정보
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 비밀번호 변경이 있는 경우 해싱
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // 사용자 업데이트 이벤트 발행
    await this.kafkaService.produce('user-updated', {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      roles: updatedUser.roles,
    });

    return updatedUser;
  }

  /**
   * 사용자 삭제
   *
   * @param id 사용자 ID
   */
  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // 사용자 삭제 이벤트 발행
    await this.kafkaService.produce('user-deleted', {
      id,
    });
  }
}