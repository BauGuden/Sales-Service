import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { dbEnvs } from 'src/config';
import MainSeeder from './seeds/seed';

const isTsRuntime = __filename.endsWith('.ts');

export const options: DataSourceOptions & SeederOptions = {
  type: 'postgres' as const,
  host: dbEnvs.dbHost,
  port: dbEnvs.dbPort,
  database: dbEnvs.dbDatabase,
  username: dbEnvs.dbUsername,
  password: dbEnvs.dbPassword,
  synchronize: dbEnvs.dbSynchronize,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  namingStrategy: new SnakeNamingStrategy(),

  seeds: [MainSeeder],
  seedTracking: true,

  schema: dbEnvs.dbSchema,
  migrationsTableName: 'migrations',
  migrations: isTsRuntime
    ? ['src/database/migrations/**/*.ts']
    : ['dist/database/migrations/**/*.js'],
};

export default new DataSource(options);
