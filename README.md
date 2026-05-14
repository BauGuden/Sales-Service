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

# Correr proyecto en modo desarrollo
pnpm run start:dev
```

## Generación de recursos

```bash

# Crear nuevo Modulo
nest g res nombreModulo

# Crear un seeder
pnpm seed:create --name src/database/seeds/nombre_seed.ts
# Correr seeder
pnpm seed:run --name src/database/seeds/{code}-nombre_seed.ts
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

## Publicar cambios

```bash

# Para enlazar a un nuevo repositorio
git remote add origin https://github.com/tu-usuario/{nombre_nuevo-microservice}.git
git add .
git commit -m "Inicialización del nuevo proyecto"
git branch -M main
git push -u origin main
```
