import { IsEmail, IsOptional, IsString, MinLength, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '@app/common';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  username?: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @IsOptional()
  @IsArray({ message: 'Roles must be an array' })
  @IsEnum(Role, { each: true, message: 'Each role must be a valid role type' })
  roles?: Role[];

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}