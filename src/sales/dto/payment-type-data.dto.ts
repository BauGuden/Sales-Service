import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class PaymentTypeDataDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsString()
  @MaxLength(10)
  shortened: string;
}
