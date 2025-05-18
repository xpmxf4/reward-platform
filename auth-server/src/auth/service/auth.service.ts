import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../../users/schema/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    // User.name은 스키마 클래스의 이름 문자열을 참조합니다.
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { username, password, roles } = createUserDto;

    const existingUser = await this.userModel.findOne({ username }).exec();
    if (existingUser) {
      throw new ConflictException(
        `사용자명 '${username}'은 이미 사용중입니다.`,
      );
    }

    // roles가 제공되지 않으면 기본값 'USER'로 설정 (스키마 기본값도 있지만, 명시적으로도 가능)
    const userToCreate = new this.userModel({
      username,
      password, // 해싱은 스키마의 pre-save hook에서 처리
      roles: roles && roles.length > 0 ? roles : ['USER'],
    });
    return userToCreate.save();
  }

  async findOneByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findOneById(userId: string): Promise<UserDocument | null> {
    // Mongoose는 ID로 검색 시 자동으로 ObjectId로 변환 시도
    return this.userModel.findById(userId).exec();
  }
}
