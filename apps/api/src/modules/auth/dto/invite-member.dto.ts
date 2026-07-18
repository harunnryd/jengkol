import { IsEmail, IsString, MinLength } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
