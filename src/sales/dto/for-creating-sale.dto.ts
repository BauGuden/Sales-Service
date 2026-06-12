import { IsUUID } from 'class-validator';

export class ForCreatingSaleDto {
  @IsUUID()
  personUuid: string;
}
