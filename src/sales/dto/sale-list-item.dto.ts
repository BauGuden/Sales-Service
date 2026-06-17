import { SaleState } from '../entities';

export class SaleListProductDto {
  productId: number;
  name: string;
  price: number;
  amount: number;
  subTotal: number;
}

export class SaleListItemDto {
  saleId: number;
  code: string | null;
  saleState: SaleState;
  personUuid: string;
  fullName: string;
  identityCard: string;
  nup: number | null;
  isPolice: boolean;
  hourSale: string;
  dateSaleFormat: string;
  products: SaleListProductDto[];
  name: string | null;
  shortened: string | null;
  depositDate: Date | null;
  total: number | null;
}
