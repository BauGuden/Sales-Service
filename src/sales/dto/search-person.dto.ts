import { IsString } from 'class-validator';

export class SearchPersonDto {
  @IsString()
  value: string;

  @IsString()
  type: string;
}
