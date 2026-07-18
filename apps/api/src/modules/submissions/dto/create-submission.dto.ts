import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @IsUrl()
  contentUrl!: string;

  @IsString()
  @IsNotEmpty()
  externalContentId!: string;
}
