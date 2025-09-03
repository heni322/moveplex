import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/database/entities/**/*.entity.js'
      : 'src/database/entities/**/*.entity{.ts,.js}'
  ],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/database/migrations/**/*.js'
      : 'src/database/migrations/**/*{.ts,.js}'
  ],
  synchronize: false, // Always false for safety
  logging: configService.get<string>('NODE_ENV') !== 'production',
});