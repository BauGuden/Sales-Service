import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateParameterDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxProducts?: number;
}
