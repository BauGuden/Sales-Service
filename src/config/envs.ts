import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  natsServers: string[];
  dbPassword: string;
  dbDatabase: string;
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbSynchronize: boolean;
  dbSchema: string;
}

const envsSchema = joi
  .object({
    natsServers: joi.array().items(joi.string().trim()).min(1).required(),
    dbPassword: joi.string().required(),
    dbDatabase: joi.string().required(),
    dbHost: joi.string().required(),
    dbPort: joi.number().port().required(),
    dbUsername: joi.string().required(),
    dbSynchronize: joi.string().valid('true', 'false').default('false'),
    dbSchema: joi.string().default('public'),
  })
  .unknown(true);

const readEnv = (camelKey: string, legacyKey: string) =>
  process.env[camelKey] ?? process.env[legacyKey];

const { error, value } = envsSchema.validate({
  natsServers: readEnv('natsServers', 'NATS_SERVERS')
    ?.split(',')
    .map((server) => server.trim()),
  dbPassword: readEnv('dbPassword', 'DB_PASSWORD'),
  dbDatabase: readEnv('dbDatabase', 'DB_DATABASE'),
  dbHost: readEnv('dbHost', 'DB_HOST'),
  dbPort: readEnv('dbPort', 'DB_PORT'),
  dbUsername: readEnv('dbUsername', 'DB_USERNAME'),
  dbSynchronize: readEnv('dbSynchronize', 'DB_SYNCHRONIZE')?.toLowerCase(),
  dbSchema: readEnv('dbSchema', 'DB_SCHEMA'),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = {
  ...value,
  dbSynchronize: value.dbSynchronize === 'true',
};

export const natsEnvs = {
  natsServers: envVars.natsServers,
};

export const dbEnvs = {
  dbPassword: envVars.dbPassword,
  dbDatabase: envVars.dbDatabase,
  dbHost: envVars.dbHost,
  dbPort: envVars.dbPort,
  dbUsername: envVars.dbUsername,
  dbSynchronize: envVars.dbSynchronize,
  dbSchema: envVars.dbSchema,
};
