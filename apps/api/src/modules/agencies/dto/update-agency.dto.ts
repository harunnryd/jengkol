import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAgencyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
