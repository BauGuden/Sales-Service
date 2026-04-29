import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ParametersService } from './parameter.service';
import { UpdateParameterDto } from './dto/update-parameter.dto';

@Controller('parameters')
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Get()
  getParameters() {
    return this.parametersService.getActiveParams();
  }

  @Patch()
  updateParameters(@Body() updateParameterDto: UpdateParameterDto) {
    return this.parametersService.update(updateParameterDto);
  }
}