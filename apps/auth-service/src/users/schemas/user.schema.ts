// apps/auth-service/src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '@app/common';

export type UserDocument = User & Document;

@Schema({
  timestamps: true, // createdAt, updatedAt 자동 추가
  collection: 'users', // 컬렉션 이름
})
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [String], enum: Object.values(Role), default: [Role.USER] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 비밀번호 필드를 응답에서 제외하는 가상 transform 설정
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});