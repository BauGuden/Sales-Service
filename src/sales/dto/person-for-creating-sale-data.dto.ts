import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class PersonForCreatingSaleDataDto {
  @IsInt()
  id: number;

  @IsUUID()
  uuidColumn: string;

  @IsString()
  fullName: string;

  @IsString()
  identityCard: string;

  @IsOptional()
  @IsInt()
  nup: number | null;

  @IsBoolean()
  isPolice: boolean;
}
