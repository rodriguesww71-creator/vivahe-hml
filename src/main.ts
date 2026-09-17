import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';

@Controller()
class HealthController {
  @Get('/') root() { return { service: 'VIVAH.e Core HML', status: 'ok' }; }
  @Get('/health')
  async health() {
    if (!process.env.DATABASE_URL) return { status: 'ok', database: 'not-configured', environment: 'hml' };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false } });
    try { await pool.query('select 1'); return { status: 'ok', database: 'connected', environment: 'hml' }; }
    finally { await pool.end(); }
  }
}
@Module({ controllers: [HealthController] }) class AppModule {}
async function bootstrap() { const app = await NestFactory.create(AppModule); app.enableCors(); await app.listen(Number(process.env.PORT || 3000), '0.0.0.0'); }
bootstrap();
