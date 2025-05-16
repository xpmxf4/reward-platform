import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsArray, IsEnum } from 'class-validator';
import { Role } from '@app/common';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  username: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be valid' })
  email: string;

  @IsOptional()
  @IsArray({ message: 'Roles must be an array' })
  @IsEnum(Role, { each: true, message: 'Each role must be a valid role type' })
  roles?: Role[];
}