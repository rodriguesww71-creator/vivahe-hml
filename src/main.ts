import 'reflect-metadata';
import { Body, Controller, Get, HttpException, HttpStatus, Module, Param, Patch, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Pool, PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false } });
async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> { const client = await pool.connect(); try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }

@Controller('api')
class CoreController {
  @Get('/') root() { return { service: 'VIVAH.ê Core HML', status: 'ok', version: '0.4.0' }; }
  @Get('/health') async health() { if (!process.env.DATABASE_URL) return { status: 'degraded', database: 'not-configured', environment: 'hml' }; await pool.query('select 1'); return { status: 'ok', database: 'connected', environment: 'hml' }; }

  @Post('/accounts/pf')
  async createPf(@Body() body: { email?: string; phone?: string; displayName?: string; cpf?: string }) {
    const { email, phone, displayName, cpf } = body;
    if (!email || !displayName || !cpf) throw new HttpException('email, displayName and cpf are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const { rows } = await client.query(`insert into accounts(account_type,email,phone,display_name,cpf) values('PF',$1,$2,$3,$4) returning id,account_type,email,phone,display_name,cpf,created_at`, [email.trim().toLowerCase(), phone ?? null, displayName.trim(), cpf.replace(/\D/g, '')]);
      const account = rows[0];
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values('core-api','ACCOUNT_CREATED','account',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountType: 'PF' })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('account.created','account',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountId: account.id, accountType: 'PF' })]);
      return account;
    });
  }

  @Post('/accounts/pj')
  async createPj(@Body() body: { email?: string; phone?: string; displayName?: string; cnpj?: string; legalName?: string; tradeName?: string }) {
    const { email, phone, displayName, cnpj, legalName, tradeName } = body;
    if (!email || !displayName || !cnpj || !legalName) throw new HttpException('email, displayName, cnpj and legalName are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const accountResult = await client.query(`insert into accounts(account_type,email,phone,display_name,cnpj) values('PJ',$1,$2,$3,$4) returning id,account_type,email,phone,display_name,cnpj,created_at`, [email.trim().toLowerCase(), phone ?? null, displayName.trim(), cnpj.replace(/\D/g, '')]);
      const account = accountResult.rows[0];
      const partnerResult = await client.query(`insert into partner_profiles(account_id,legal_name,trade_name) values($1,$2,$3) returning account_id,legal_name,trade_name,status`, [account.id, legalName.trim(), tradeName?.trim() ?? null]);
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values('core-api','PARTNER_CREATED','partner',$1,$2::jsonb)`, [account.id, JSON.stringify({ status: 'PENDING' })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('partner.created','partner',$1,$2::jsonb)`, [account.id, JSON.stringify({ accountId: account.id, status: 'PENDING' })]);
      return { account, partner: partnerResult.rows[0] };
    });
  }

  @Post('/partners/:id/coverage')
  async saveCoverage(@Param('id') id: string, @Body() body: any) {
    const radius = body.coverageMode === 'CITY' ? null : Number(body.radiusKm);
    if (!body.cep || !body.city || !body.state || !Number.isFinite(Number(body.latitude)) || !Number.isFinite(Number(body.longitude))) throw new HttpException('address, latitude and longitude are required', HttpStatus.BAD_REQUEST);
    if (body.coverageMode !== 'CITY' && ![3,5,7,10,15,20].includes(radius)) throw new HttpException('invalid coverage radius', HttpStatus.BAD_REQUEST);
    const payload = { cep:String(body.cep).replace(/\\D/g,''), street:body.street, number:body.number, complement:body.complement||null, district:body.district, city:body.city, state:body.state, latitude:Number(body.latitude), longitude:Number(body.longitude), coverageMode:body.coverageMode === 'CITY' ? 'CITY' : 'RADIUS', radiusKm:radius };
    if (!process.env.DATABASE_URL) return { partnerId:id, ...payload, persisted:false, environment:'hml' };
    await pool.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values('hml-ui','PARTNER_COVERAGE_UPDATED','partner',$1,$2::jsonb)`,[id,JSON.stringify(payload)]);
    await pool.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('partner.coverage_updated','partner',$1,$2::jsonb)`,[id,JSON.stringify({partnerId:id,...payload})]);
    return { partnerId:id, ...payload, persisted:true, matchingEligible:true };
  }

  @Post('/matching/coverage/check')
  checkCoverage(@Body() body: any) {
    const lat1=Number(body.partnerLatitude), lon1=Number(body.partnerLongitude), lat2=Number(body.eventLatitude), lon2=Number(body.eventLongitude);
    if (![lat1,lon1,lat2,lon2].every(Number.isFinite)) throw new HttpException('partner and event coordinates are required',HttpStatus.BAD_REQUEST);
    if (body.coverageMode === 'CITY') return { eligible:String(body.partnerCity||'').toLowerCase()===String(body.eventCity||'').toLowerCase(), mode:'CITY' };
    const toRad=(x:number)=>x*Math.PI/180, R=6371, dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; const distanceKm=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); const radiusKm=Number(body.radiusKm);
    return { eligible:distanceKm<=radiusKm, distanceKm:Number(distanceKm.toFixed(2)), radiusKm, mode:'RADIUS' };
  }

  @Post('/contracts/simulate')
  async simulateContract(@Body() body: { partnerNet?: number; percentageCosts?: number; installments?: number }) {
    const partnerNet = Number(body.partnerNet ?? 0); const percentageCosts = Number(body.percentageCosts ?? 0.20); const installments = Number(body.installments ?? 12);
    if (partnerNet <= 0 || percentageCosts < 0 || percentageCosts >= 1 || installments < 1) throw new HttpException('invalid simulation parameters', HttpStatus.BAD_REQUEST);
    const publicPrice = partnerNet / (1 - percentageCosts);
    return { environment: 'hml', partnerNet, percentageCosts, publicPrice: Number(publicPrice.toFixed(2)), installmentValue: Number((publicPrice / installments).toFixed(2)), installments, milestones: [25,25,25,25], status: 'SIMULATED' };
  }

  @Post('/contracts/:id/events')
  async contractEvent(@Param('id') id: string, @Body() body: { event?: string; actor?: string; note?: string }) {
    const allowed = ['PAYMENT_APPROVED','PARTNER_CONFIRMED','MILESTONE_VALIDATED','MILESTONE_BLOCKED','EVENT_COMPLETED','CHECKOUT_COMPLETED','REVIEW_SUBMITTED'];
    if (!body.event || !allowed.includes(body.event)) throw new HttpException('valid event is required', HttpStatus.BAD_REQUEST);
    const actor = body.actor || 'hml-ui';
    if (!process.env.DATABASE_URL) return { contractId: id, event: body.event, actor, note: body.note ?? null, recorded: false, environment: 'hml', reason: 'database-not-configured' };
    await pool.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values($1,$2,'contract',$3,$4::jsonb)`, [actor, body.event, id, JSON.stringify({ note: body.note ?? null })]);
    await pool.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values($1,'contract',$2,$3::jsonb)`, ['contract.'+body.event.toLowerCase(), id, JSON.stringify({ contractId: id, event: body.event })]);
    return { contractId: id, event: body.event, actor, recorded: true, environment: 'hml' };
  }

  @Get('/contracts/:id/state')
  async contractState(@Param('id') id: string) {
    if (!process.env.DATABASE_URL) return { contractId: id, status: 'HML_DEMO', timeline: [] };
    const { rows } = await pool.query(`select action,actor,payload,created_at from audit_log where entity_type='contract' and entity_id=$1 order by created_at asc`, [id]);
    return { contractId: id, timeline: rows, lastEvent: rows.length ? rows[rows.length-1].action : null };
  }

  @Get('/accounts/:id') async getAccount(@Param('id') id: string) { const { rows } = await pool.query(`select a.id,a.account_type,a.email,a.phone,a.display_name,a.cpf,a.cnpj,a.created_at,a.updated_at,p.legal_name,p.trade_name,p.status as partner_status,p.reviewed_at,p.reviewed_by,p.review_note from accounts a left join partner_profiles p on p.account_id=a.id where a.id=$1`, [id]); if (!rows[0]) throw new HttpException('account not found', HttpStatus.NOT_FOUND); return rows[0]; }

  @Patch('/partners/:id/status')
  async reviewPartner(@Param('id') id: string, @Body() body: { status?: string; reviewedBy?: string; note?: string }) {
    const { status, reviewedBy, note } = body; const allowed = ['UNDER_REVIEW','APPROVED','REJECTED'];
    if (!status || !allowed.includes(status) || !reviewedBy) throw new HttpException('valid status and reviewedBy are required', HttpStatus.BAD_REQUEST);
    return tx(async client => {
      const { rows } = await client.query(`update partner_profiles set status=$2::partner_status,reviewed_at=now(),reviewed_by=$3,review_note=$4 where account_id=$1 returning account_id,legal_name,trade_name,status,reviewed_at,reviewed_by,review_note`, [id, status, reviewedBy, note ?? null]);
      if (!rows[0]) throw new HttpException('partner not found', HttpStatus.NOT_FOUND);
      await client.query(`insert into audit_log(actor,action,entity_type,entity_id,payload) values($2,'PARTNER_STATUS_CHANGED','partner',$1,$3::jsonb)`, [id, reviewedBy, JSON.stringify({ status, note: note ?? null })]);
      await client.query(`insert into outbox_events(event_type,aggregate_type,aggregate_id,payload) values('partner.status_changed','partner',$1,$2::jsonb)`, [id, JSON.stringify({ accountId: id, status })]);
      return rows[0];
    });
  }
}
@Module({ controllers: [CoreController] }) class AppModule {}
async function bootstrap() { const app = await NestFactory.create<NestExpressApplication>(AppModule); app.enableCors(); app.useStaticAssets(join(process.cwd(), 'public')); await app.listen(Number(process.env.PORT || 3000), '0.0.0.0'); }
bootstrap();
