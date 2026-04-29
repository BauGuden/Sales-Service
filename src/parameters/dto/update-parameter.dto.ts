import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateParameterDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_products?: number;
}