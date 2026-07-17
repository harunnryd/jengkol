import { RateModel } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  agencyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsNumber()
  budget!: number;

  @IsEnum(RateModel)
  rateModel!: RateModel;

  @ValidateIf((dto) => dto.rateModel === RateModel.FLAT)
  @IsNumber()
  flatRate?: number;

  @ValidateIf((dto) => dto.rateModel === RateModel.PER_VIEW)
  @IsNumber()
  ratePerView?: number;
}
