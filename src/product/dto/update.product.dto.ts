import { IsOptional } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() 
  name?: string;
  
  @IsOptional() 
  code?: string;
  
  @IsOptional() 
  price?: number;
  
  @IsOptional() 
  group_id?: number;
  
  @IsOptional() 
  isActive?: boolean;
}