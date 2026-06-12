import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class AccountDataDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @MaxLength(50)
  eif: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(50)
  accountNumber: string;
}
