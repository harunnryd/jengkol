import { RateModel } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsNumber()
  @Min(0)
  budget!: number;

  @IsEnum(RateModel)
  rateModel!: RateModel;

  @ValidateIf((dto) => dto.rateModel === RateModel.FLAT)
  @IsNumber()
  @Min(0)
  flatRate?: number;

  @ValidateIf((dto) => dto.rateModel === RateModel.PER_VIEW)
  @IsNumber()
  @Min(0)
  ratePerView?: number;
}
