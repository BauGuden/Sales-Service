import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametersController } from './parameter.controller';
import { ParametersService } from './parameter.service';
import { Parameter } from './entities/parameter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parameter])],
  controllers: [ParametersController],
  providers: [ParametersService],
  exports: [ParametersService], // Importante: Exportar para usar en Sales
})
export class ParametersModule {}