import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // createdAt, updatedAt 자동 생성
export class User {
  @Prop({ required: true, unique: true, trim: true, index: true }) // username은 검색에 자주 사용되므로 index 추가
  username: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: [String], default: ['USER'] })
  roles: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const saltRounds = 10; // bcrypt salt rounds
    this.password = await bcrypt.hash(this.password, saltRounds);
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// 비밀번호 일치 여부 확인을 위한 인스턴스 메서드
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};