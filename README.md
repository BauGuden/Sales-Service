## Descripción

[Nest] Plantilla para crear nuevos proyectos enfocado a micro servicios.

## Clonar el repositorio y agregarle un nombre nuevo del nuevo proyecto

```bash
git clone https://github.com/MUTUAL-DE-SERVICIOS-AL-POLICIA/template-microservice.git nombre-service
```

## Inicializar proyecto

```bash
# Entrar al repositorio clonado con el nuevo nombre del proyecto
cd nombre-microservice

# Elimina el origen remoto actual,
git remote remove origin

# Crear el archivo .env en base al .env.example
cp .env.example .env

# Instalar las dependencias
pnpm install

# Ejecutar migraciones
pnpm migration:run

# Correr el seeder principal
pnpm seed:run

# Correr proyecto en modo desarrollo
pnpm start:dev
```

## Migraciones

Las migraciones viven en `src/database/migrations`.

```bash
# Crear una migración vacía
pnpm migration:create nombre-de-la-migracion

# Ver estado de migraciones
pnpm migration:show

# Ejecutar migraciones
pnpm migration:run

# Revertir la última migración ejecutada
pnpm migration:revert
```

## Seeder

El seeder principal vive en `src/database/seeds/seed.ts`.

```bash
# Crear un nuevo archivo seeder
pnpm seed:create nombre-del-seeder

# Ejecutar primero la estructura de base de datos
pnpm migration:run

# Cargar datos base en el schema sales
pnpm seed:run

# Revertir los datos base del seeder principal
pnpm seed:revert
```