import { IsUUID } from 'class-validator';

export class SearchPersonDataDto {
  @IsUUID()
  uuidColum: string;
}
