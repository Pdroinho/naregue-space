import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { migrateBaseline } from './testing/nareguaBaselineMigration.js'
import { migrate } from './migrate.js'
import { createCustomerAppointmentService } from './customerAppointmentService.js'

const tenant = '11111111-1111-4111-8111-111111111111'
const service = '22222222-2222-4222-8222-222222222222'
const client = '33333333-3333-4333-8333-333333333333'
const now = '2026-10-20T08:00:00.000Z'

function baseline() {
  const db = new Database(':memory:')
  migrateBaseline(db)
  db.prepare("INSERT INTO tenants(id,slug,name,primary_color,status,created_at) VALUES(?,?,?,'#b85a30','ACTIVE',?)").run(tenant,'barbearia','Barbearia existente',now)
  db.prepare("INSERT INTO users(id,tenant_id,email,password_hash,role,created_at) VALUES(?,?,?,'hash','CLIENT',?)").run(client,tenant,'cliente@example.com',now)
  db.prepare("INSERT INTO clients(id,tenant_id,user_id,name,created_at) VALUES('contact',?,?,'Cliente existente',?)").run(tenant,client,now)
  db.prepare("INSERT INTO services(id,tenant_id,name,duration_minutes,price_cents,created_at) VALUES(?,?,'Corte',30,4000,?)").run(service,tenant,now)
  db.prepare("INSERT INTO professionals(id,tenant_id,name,nickname,color,inherits_hours,created_at,updated_at) VALUES('barber',?,'Barbeiro','Apelido','#347a8a',0,?,?)").run(tenant,now,now)
  db.prepare("INSERT INTO professional_services VALUES(?,?,?,?)").run(tenant,'barber',service,now)
  db.prepare("INSERT INTO professional_hours VALUES('hours',?,'barber',2,545,660,?)").run(tenant,now)
  db.prepare("INSERT INTO business_hours(id,tenant_id,weekday,start_minute,end_minute,created_at) VALUES('global',?,2,600,660,'2026-10-20')").run(tenant)
  db.prepare("INSERT INTO tenant_settings(tenant_id,secondary_color,timezone,currency,created_at,updated_at) VALUES(?,'#031722','UTC','BRL',?,?)").run(tenant,now,now)
  db.prepare("INSERT INTO booking_rules(tenant_id,min_notice_minutes,max_future_days,slot_step_minutes,created_at,updated_at) VALUES(?,0,60,30,'2026-10-20','2026-10-20')").run(tenant)
  return db
}

test('upgrade 40 → 117 preserves IDs, branding, personal hours, links and scoped blocks; replay is safe', () => {
  const db = baseline()
  try {
    db.prepare("INSERT INTO time_off(id,tenant_id,professional_id,starts_at,ends_at,reason,created_at) VALUES('block',?,'barber','2026-10-20T10:00:00Z','2026-10-20T10:30:00Z','Folga',?)").run(tenant,now)
    migrate(db); migrate(db)
    assert.deepEqual(db.prepare("SELECT name,nickname,color FROM professionals WHERE id='barber'").get(), {name:'Barbeiro',nickname:'Apelido',color:'#347a8a'})
    assert.equal((db.prepare('SELECT count(*) n FROM professional_time_off').get() as {n:number}).n,1)
    assert.equal((db.prepare('SELECT count(*) n FROM time_off').get() as {n:number}).n,0)
    assert.equal((db.prepare('SELECT count(*) n FROM professional_services WHERE professional_id=?').get('barber') as {n:number}).n,1)
    assert.deepEqual(db.pragma('foreign_key_check'),[])
    assert.equal((db.prepare('SELECT max(version) v FROM schema_migrations').get() as {v:number}).v,117)
    assert.equal((db.prepare('SELECT billing_name FROM users WHERE id=?').get(client) as {billing_name:string|null}).billing_name,null)
    assert.equal((db.prepare('SELECT count(*) n FROM abacatepay_catalog').get() as {n:number}).n,0)
  } finally { db.close() }
})

test('relative 09:05 grid and personal hours outside global opening remain bookable; price is immutable across catalog edits', () => {
  const db = baseline()
  try {
    migrate(db)
    const booking = createCustomerAppointmentService({db,staffEnabled:true,now:()=>new Date(now),scheduleAppointmentAutomationJobs:()=>{}})
    const appointment = booking.createAppointmentForUser({tenantId:tenant,userId:client,serviceId:service,startsAt:'2026-10-20T09:05:00.000Z'})
    assert.equal(appointment.professionalId,'barber')
    db.prepare('UPDATE services SET price_cents=5000 WHERE id=?').run(service)
    assert.equal((db.prepare('SELECT booked_price_cents p FROM appointments WHERE id=?').get(appointment.id) as {p:number}).p,4000)
    assert.throws(()=>booking.createAppointmentForUser({tenantId:tenant,userId:client,serviceId:service,startsAt:'2026-10-20T09:05:00.000Z'}),/indisponível/)
    assert.throws(()=>booking.createAppointmentForUser({tenantId:tenant,userId:client,serviceId:service,startsAt:'2026-10-20T09:40:00.000Z'}),/indisponível/)
  } finally { db.close() }
})
