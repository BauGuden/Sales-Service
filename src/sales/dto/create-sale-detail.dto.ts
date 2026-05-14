import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSaleDetailDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  folderNumber?: string;

  @IsOptional()
  @IsString()
  voucherNumber?: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parameterId?: number;
}
