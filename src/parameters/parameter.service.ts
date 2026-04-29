import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parameter } from './entities/parameter.entity';
import { UpdateParameterDto } from './dto/update-parameter.dto';

@Injectable()
export class ParametersService {
  constructor(
    @InjectRepository(Parameter)
    private readonly parameterRepo: Repository<Parameter>,
  ) {}

  // Asumimos que siempre usaremos el ID 1 para la configuración global
  async getActiveParams() {
    let params = await this.parameterRepo.findOne({ where: { id: 1 } });

    if (!params) {
      // Si no existe, creamos uno por defecto
      params = this.parameterRepo.create({ id: 1, max_amount: 0, max_products: 1 });
      return await this.parameterRepo.save(params);
    }
    return params;
  }

  async update(updateParameterDto: UpdateParameterDto) {
    const params = await this.getActiveParams();
    Object.assign(params, updateParameterDto);
    return this.parameterRepo.save(params);
  }
}