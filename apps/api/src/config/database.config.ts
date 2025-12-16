import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1973',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'whereto_catalog',
    ssl: process.env.DB_SSL === 'true',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    // CRITICAL: synchronize must NEVER be true in production
    // It will auto-disable if NODE_ENV=production OR if DB_SYNCHRONIZE=false
    synchronize:
      process.env.NODE_ENV !== 'production' &&
      process.env.DB_SYNCHRONIZE !== 'false' &&
      process.env.DB_SYNCHRONIZE !== '0',
    logging: process.env.NODE_ENV === 'development',
    extra: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    },
  }),
);
