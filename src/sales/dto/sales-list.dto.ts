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

export class SalesListItemReportDto {
  @IsString()
  code: string | null;

  receptionDate: Date | null;
  principalCustomer: string;
  service: string;

  @Type(() => Number)
  amount: number;

  price: string;
  paymentType: string;
  total: string;
  receptionist: string;
}
