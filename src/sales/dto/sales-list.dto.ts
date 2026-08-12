import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common';

export class SalesListDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class SalesListProductReportDto {
  @IsString()
  name: string;

  @Type(() => Number)
  amount: number;

  @IsString()
  price: string;
}

export class SalesListItemReportDto {
  @IsString()
  code: string | null;

  @IsString()
  receptionDate: string | null;

  @IsString()
  principalCustomer: string;

  @IsString()
  service: string;

  @Type(() => Number)
  amount: number;

  @IsString()
  price: string;

  @Type(() => SalesListProductReportDto)
  products: SalesListProductReportDto[];

  @IsString()
  paymentType: string;

  @IsString()
  total: string;

  @IsString()
  receptionist: string;
}
