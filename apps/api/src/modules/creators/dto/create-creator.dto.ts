import { CreatorType, Platform } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCreatorDto {
  @IsString()
  @IsNotEmpty()
  agencyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(CreatorType)
  type!: CreatorType;

  @IsEnum(Platform)
  platform!: Platform;

  @IsString()
  @IsNotEmpty()
  externalHandle!: string;

  @IsOptional()
  @IsNumber()
  followers?: number;

  @IsOptional()
  @IsNumber()
  avgEngagementRate?: number;
}
