export enum CollectionState {
  COINCILIADO = 'COINCILIADO',
  NO_COINCILIADO = 'NO COINCILIADO',
}

export interface CreateCollectionTransactionDto {
  paymentDate: string;
  titularName: string;
  payerName: string;
  description: string;
  origin: string;
  accountNumber: string;
  paymentType: string;
  receptionistUser: string;
  total: number;
  state: CollectionState;
}
