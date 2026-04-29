import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { SalesModule } from './sale/sales.module';
import { GroupModule } from './group/group.module';
import { ProductModule } from './product/product.module';
import { ParametersModule } from './parameters/parameter.module';
import { SaleDetailModule } from './sale-detail/sale-detail.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule, 
    CommonModule,
    ParametersModule,
    GroupModule,
    ProductModule,
    SaleDetailModule,
    SalesModule,
  ],  controllers: [],
  providers: [],
})
export class AppModule {}
