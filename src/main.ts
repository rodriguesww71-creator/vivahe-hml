import 'reflect-metadata';
import { Body, Controller, Get, HttpException, HttpStatus, Module, Param, Patch, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

@Controller()
class CoreController {
  @Get('/') root() { return { service: 'VIVAH.ê Core HML', status: 'ok', version: '0.2.0' }; }

  @Get('/health')
  async health() {
    if (!process.env.DATABASE_URL) return { status: 'degraded', database: 'not-configured', environment: 'hml' };
    await pool.query('select 1');
    return { status: 'ok', database: 'connected', environment: 'hml' };
  }

  @Post('/accounts/pf')
  async createPf(@Body() body: { email?: string; phone?: string; displayName?: string; cpf?: string }) {
    if (!body.email || !body.displayName || !body.cpf) throw new HttpException('email, displayName and cpf are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const { rows } = await client.query(
        `insert into accounts(account_type,email,phone,display_name,cpf) values('PF',$1,$2,$3,$4) returning id,account_type,email,phone,display_name,cpf,created_at`,
        [body.email.trim().toLowerCase(), body.phone ?? null, body.displayName.trim(), body.cpf.replace(/\D/g, '')]
      );
      const account = rows[0];
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values('core-api','ACCOUNT_CREATED','account',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountType: 'PF' })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('account.created','account',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountId: account.id, accountType: 'PF' })]);
      return account;
    });
  }

  @Post('/accounts/pj')
  async createPj(@Body() body: { email?: string; phone?: string; displayName?: string; cnpj?: string; legalName?: string; tradeName?: string }) {
    if (!body.email || !body.displayName || !body.cnpj || !body.legalName) throw new HttpException('email, displayName, cnpj and legalName are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const accountResult = await client.query(
        `insert into accounts(account_type,email,phone,display_name,cnpj) values('PJ',$1,$2,$3,$4) returning id,account_type,email,phone,display_name,cnpj,created_at`,
        [body.email.trim().toLowerCase(), body.phone ?? null, body.displayName.trim(), body.cnpj.replace(/\D/g, '')]
      );
      const account = accountResult.rows[0];
      const partnerResult = await client.query(`insert into partner_profiles(account_id,legal_name,trade_name) values($1,$2,$3) returning account_id,legal_name,trade_name,status`, [account.id, body.legalName.trim(), body.tradeName?.trim() ?? null]);
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values('core-api','PARTNER_CREATED','partner',$1,$2::jsonb)`, [account.id, JSON.stringify({ status: 'PENDING' })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('partner.created','partner',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountId: account.id, status: 'PENDING' })]);
      return { account, partner: partnerResult.rows[0] };
    });
  }

  @Get('/accounts/:id')
  async getAccount(@Param('id') id: string) {
    const { rows } = await pool.query(`select a.id,a.account_type,a.email,a.phone,a.display_name,a.cpf,a.cnpj,a.created_at,a.updated_at,p.legal_name,p.trade_name,p.status as partner_status,p.reviewed_at,p.reviewed_by,p.review_note from accounts a left join partner_profiles p on p.account_id=a.id where a.id=$1`, [id]);
    if (!rows[0]) throw new HttpException('account not found', HttpStatus.NOT_FOUND);
    return rows[0];
  }

  @Patch('/partners/:id/status')
  async reviewPartner(@Param('id') id: string, @Body() body: { status?: string; reviewedBy?: string; note?: string }) {
    const allowed = ['UNDER_REVIEW','APPROVED','REJECTED'];
    if (!body.status || !allowed.includes(body.status) || !body.reviewedBy) throw new HttpException('valid status and reviewedBy are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const { rows } = await client.query(`update partner_profiles set status=$2::partner_status,reviewed_at=now(),reviewed_by=$3,review_note=$4 where account_id=$1 returning account_id,legal_name,trade_name,status,reviewed_at,reviewed_by,review_note`, [id, body.status, body.reviewedBy, body.note ?? null]);
      if (!rows[0]) throw new HttpException('partner not found', HttpStatus.NOT_FOUND);
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values($2,'PARTNER_STATUS_CHANGED','partner',$1,$3::jsonb)`, [id, body.reviewedBy, JSON.stringify({ status: body.status, note: body.note ?? null })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('partner.status_changed','partner',$1,$2::jsonb)`, [id, JSON.stringify({ accountId: id, status: body.status })]);
      return rows[0];
    });
  }
}

@Module({ controllers: [CoreController] }) class AppModule {}
async function bootstrap() { const app = await NestFactory.create(AppModule); app.enableCors(); await app.listen(Number(process.env.PORT || 3000), '0.0.0.0'); }
bootstrap();
