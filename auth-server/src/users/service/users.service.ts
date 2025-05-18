import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { username, password, roles } = createUserDto;

    const existingUser = await this.userModel.findOne({ username }).exec();
    if (existingUser) {
      throw new ConflictException(`사용자명 '${username}'은 이미 사용중입니다.`);
    }

    const userToCreate = new this.userModel({
      username,
      password,
      roles: roles && roles.length > 0 ? roles : ['USER'],
    });
    return userToCreate.save();
  }

  async findOneByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findOneById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }
}