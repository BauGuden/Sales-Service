import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Group } from '../../group/entities/group.entity';
import { Product } from '../../product/entities/product.entity';
import { Parameter } from '../../parameters/entities/parameter.entity';

const run = async () => {
  // 1. Creamos el contexto de NestJS (sin levantar el servidor HTTP, solo lógica)
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('⏳ Conectando a la base de datos para sembrar datos...');

  // 2. Inyectamos los repositorios
  const groupRepo = app.get(getRepositoryToken(Group));
  const productRepo = app.get(getRepositoryToken(Product));
  const paramRepo = app.get(getRepositoryToken(Parameter));

  try {
    // --- SEEDING GROUPS ---
    const existingGroups = await groupRepo.count();
    if (existingGroups === 0) {
      console.log('🌱 Sembrando Groups...');
      const groups = [
        groupRepo.create({ id: 1, name: 'SERVICIOS VARIOS', account_id: 1 }),
        groupRepo.create({ id: 2, name: 'AUXILIO MORTUORIO', account_id: 2 }),
        groupRepo.create({ id: 3, name: 'FONDO DE RETIRO Y CUOTA MORTUORIA', account_id: 4 }),
        groupRepo.create({ id: 4, name: 'PRÉSTAMOS Y DIVIDENDOS', account_id: 3 }),
        groupRepo.create({ id: 5, name: 'HOTEL PARÍS', account_id: 5 }),
      ];
      await groupRepo.save(groups);
      console.log(`✅ Groups insertados: ${groups.length}`);
    } else {
      console.log('⏭️  Groups ya existen. Saltando...');
    }

    // --- SEEDING PRODUCTS ---
    const existingProducts = await productRepo.count();
    if (existingProducts === 0) {
      console.log('🌱 Sembrando Products (Foders)...');
      // Aseguramos que los grupos existan antes de insertar productos
      const groupServicios = await groupRepo.findOne({ where: { id: 1 } });
      const groupAuxilio = await groupRepo.findOne({ where: { id: 2 } });
      const groupRetiro = await groupRepo.findOne({ where: { id: 3 } });

      const products = [
        productRepo.create({
          name: 'Folder Complemento Económico',
          code: 'F-CE',
          price: 25,
          isActive: true,
          group: groupServicios,
        }),
        productRepo.create({
          name: 'Folder Fondo de Retiro',
          code: 'F-FR',
          price: 25,
          isActive: true,
          group: groupRetiro,
        }),
        productRepo.create({
          name: 'Folder Cuota Mortuoria',
          code: 'F-CM',
          price: 25,
          isActive: true,
          group: groupAuxilio,
        }),
        productRepo.create({
          name: 'Folder Auxilio Mortuorio',
          code: 'F-AM',
          price: 25,
          isActive: true,
          group: groupAuxilio,
        }),
        productRepo.create({
          name: 'Folder Préstamo Sector Activo',
          code: 'F-PA',
          price: 25,
          isActive: true,
          group: groupServicios, // O puede ir a grupo Préstamos si lo creas
        }),
        productRepo.create({
          name: 'Folder Préstamo Sector Pasivo',
          code: 'F-PP',
          price: 15,
          isActive: true,
          group: groupServicios,
        }),
      ];
      await productRepo.save(products);
      console.log(`✅ Products insertados: ${products.length}`);
    } else {
      console.log('⏭️  Products ya existen. Saltando...');
    }

    // --- SEEDING PARAMETERS ---
    const existingParams = await paramRepo.count();
    if (existingParams === 0) {
      console.log('🌱 Sembrando Parameters...');
      const params = paramRepo.create({
        id: 1,
        max_amount: 0, // 0 = Sin límite
        max_products: 1, // Límite actual requerido
      });
      await paramRepo.save(params);
      console.log(`✅ Parameters insertados: 1`);
    } else {
      console.log('⏭️  Parameters ya existen. Saltando...');
    }

    console.log('🎉 Base de datos sembrada exitosamente!');
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
  } finally {
    // Cerramos la conexión
    await app.close();
    process.exit(0);
  }
};

// Ejecutamos el script
void run();