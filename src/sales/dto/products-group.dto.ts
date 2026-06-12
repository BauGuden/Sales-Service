import { IsInt, IsPositive } from 'class-validator';

export class ProductsGroupDto {
  @IsInt()
  @IsPositive()
  groupId: number;
}
