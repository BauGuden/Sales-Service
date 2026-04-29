import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaginationDto } from 'src/common'; // Asumiendo que lo tienes en common

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  // (Opcional) Endpoint para listar ventas con paginación
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }
}