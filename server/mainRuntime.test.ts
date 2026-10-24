import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { migrate } from './migrate.js'
import { createSession } from './session.js'

test('complete composition boots against migrated SQLite; booking, catalog edit, finance and staff permissions work over HTTP',async()=>{
  const directory=mkdtempSync(path.join(tmpdir(),'naregua-http-')),databasePath=path.join(directory,'app.db')
  const db=new Database(databasePath);migrate(db)
  const tenant=randomUUID(),admin=randomUUID(),service=randomUUID(),now=new Date().toISOString()
  db.prepare("INSERT INTO tenants(id,slug,name,primary_color,status,created_at) VALUES(?,'barbearia','Barbearia HTTP','#b85a30','ACTIVE',?)").run(tenant,now)
  db.prepare("INSERT INTO users(id,tenant_id,email,password_hash,role,phone,created_at) VALUES(?,?,'owner@example.com','hash','ADMIN','+5571988887777',?)").run(admin,tenant,now)
  db.prepare('UPDATE professionals SET user_id=? WHERE id=?').run(admin,tenant)
  db.prepare("INSERT INTO services(id,tenant_id,name,duration_minutes,price_cents,created_at) VALUES(?,?,'Corte',30,4000,?)").run(service,tenant,now)
  db.prepare("INSERT INTO tenant_settings(tenant_id,secondary_color,timezone,currency,created_at,updated_at) VALUES(?,'#031722','UTC','BRL',?,?)").run(tenant,now,now)
  db.prepare('INSERT INTO booking_rules(tenant_id,min_notice_minutes,max_future_days,slot_step_minutes,created_at,updated_at) VALUES(?,0,60,30,?,?)').run(tenant,now,now)
  for(let day=0;day<7;day++)db.prepare('INSERT INTO business_hours(id,tenant_id,weekday,start_minute,end_minute,created_at) VALUES(?,?,?,540,1080,?)').run(randomUUID(),tenant,day,now)
  db.prepare("INSERT INTO subscriptions(id,tenant_id,status,current_period_end,billing_cycle,plan_code,created_at,updated_at) VALUES(?,?,'ACTIVE','2030-01-01T00:00:00Z','MONTHLY','TEAM_15',?,?)").run(randomUUID(),tenant,now,now)
  const token=createSession(db,{userId:admin}).token
  db.close()
  const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening')
  const port=(listener.address() as {port:number}).port;await new Promise<void>(resolve=>listener.close(()=>resolve()))
  const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,NODE_ENV:'test',ENV_FILE:path.join(directory,'no-env'),DATABASE_PATH:databasePath,WHATSAPP_MEDIA_DIR:path.join(directory,'media'),PORT:String(port),HOST:'127.0.0.1',APP_BASE_URL:'https://naregua.localhost',FRONTEND_ORIGIN:'https://naregua.localhost',DEV_HOST:'dev.naregua.localhost',AI_ASSISTANT_ENABLED:'false',ABACATEPAY_CHECKOUT_ENABLED:'false'},stdio:'pipe'})
  let logs='';child.stdout.on('data',buffer=>{logs=(logs+String(buffer)).slice(-16000)});child.stderr.on('data',buffer=>{logs=(logs+String(buffer)).slice(-16000)})
  const origin=`http://127.0.0.1:${port}`
  async function request(url:string,init:RequestInit={}){
    return fetch(origin+url,{...init,headers:{host:'barbearia.naregua.localhost',origin:'http://barbearia.naregua.localhost','content-type':'application/json',...(init.headers??{})}})
  }
  try{
    let ready=false
    for(let i=0;i<80;i++){
      if(child.exitCode!==null)throw new Error(`Runtime exited: ${logs}`)
      try{ready=(await fetch(origin+'/api/ready')).ok;if(ready)break}catch{/* Wait for listening. */}
      await new Promise(resolve=>setTimeout(resolve,100))
    }
    assert.ok(ready,logs)
    const catalog=await request('/api/public/tenant/barbearia/services');assert.equal(catalog.status,200)
    const day=new Date();day.setUTCDate(day.getUTCDate()+1);day.setUTCHours(10,0,0,0)
    const booking=await request('/api/public/tenant/barbearia/appointments',{method:'POST',body:JSON.stringify({serviceId:service,startsAt:day.toISOString(),name:'Cliente HTTP',phone:'71988886666'})})
    const booked=await booking.json() as {appointment:{id:string}}
    assert.equal(booking.status,200,JSON.stringify(booked))
    const cookie={cookie:`session=${token}`}
    const edit=await request(`/api/admin/services/${service}`,{method:'PATCH',headers:cookie,body:JSON.stringify({priceCents:5000})});assert.equal(edit.status,200)
    const connection=new Database(databasePath,{readonly:true})
    assert.equal((connection.prepare('SELECT booked_price_cents p FROM appointments WHERE id=?').get(booked.appointment.id) as {p:number}).p,4000)
    connection.close()
    assert.equal((await request('/api/admin/dashboard',{headers:cookie})).status,200)
    assert.equal((await request(`/api/admin/dashboard?professionalId=${tenant}`,{headers:cookie})).status,200)
    assert.equal((await request('/api/admin/finance',{headers:cookie})).status,200)
    assert.equal((await request('/api/staff/profile',{headers:cookie})).status,403)
    assert.equal((await request('/api/public/onboarding/checkout',{method:'POST',body:'{}'})).status,410)
    const compressed=await request('/api/auth/login',{method:'POST',headers:{'content-encoding':'gzip'},body:'invalid compressed bytes'})
    assert.ok(compressed.status>=400);assert.equal((await fetch(origin+'/api/ready')).status,200)
  }finally{
    child.kill();if(child.exitCode===null)await once(child,'exit')
    rmSync(directory,{recursive:true,force:true})
  }
})
