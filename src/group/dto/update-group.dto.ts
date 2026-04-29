import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsNumber()
  account_id?: number;
}