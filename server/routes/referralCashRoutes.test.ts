import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import express,{type RequestHandler} from 'express'
import Database from 'better-sqlite3'
import { migrate } from '../migrate.js'
import { createReferralCashService,CASH_POLICY } from '../referralCash.js'
import { createReferralCashRouters } from './referralCashRoutes.js'
import { handleError } from '../http.js'
import { hashPassword } from '../security.js'

test('cash routes require ADMIN/DEV, explicit policy acceptance, correct password and tenant isolation',async()=>{
 const db=new Database(':memory:');migrate(db);const password='qa-private-password',hash=await hashPassword(password)
 for(const id of ['one','two']){db.prepare('INSERT INTO tenants(id,slug,name,primary_color,created_at) VALUES(?,?,?,?,?)').run(id,id,id,'#b85a30',new Date().toISOString());db.prepare("INSERT INTO users(id,tenant_id,email,password_hash,role,created_at) VALUES(?,?,?,?,'ADMIN',?)").run(id,id,id+'@example.com',hash,new Date().toISOString())}
 const cash=createReferralCashService(db,null),pass:RequestHandler=(_req,_res,next)=>next(),app=express();app.use(express.json());app.use((req,_res,next)=>{const role=req.get('x-role');if(role)req.sessionUser={id:req.get('x-user')??'one',tenantId:req.get('x-tenant')??'one',role:role as 'ADMIN'|'DEV'|'CLIENT',sessionId:'test',persistent:false,trustedDeviceId:null};if(req.get('x-host-tenant'))req.resolvedTenant={id:req.get('x-host-tenant')!,slug:'test'};next()})
 const routes=createReferralCashRouters({db,cash,requireDevHost:(req,res,next)=>req.get('x-dev-host')==='yes'?next():res.status(403).json({message:'Dev host required'}),mutationLimiter:pass,passwordLimiter:pass,token:()=> 'cash-referral-route-test-token',publicUrl:token=>'https://example.com/?ref='+token,enabled:true,verifyReward:async()=>false});app.use('/api/admin',routes.admin);app.use('/api/dev',routes.dev);app.use(handleError)
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port
 const request=(path:string,body?:unknown,headers:Record<string,string>={})=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})})
 try{
  assert.equal((await request('/api/admin/referrals/cash')).status,401)
  assert.equal((await request('/api/admin/referrals/cash',undefined,{'x-role':'CLIENT'})).status,403)
  assert.equal((await request('/api/admin/referrals/cash',undefined,{'x-role':'ADMIN','x-host-tenant':'two'})).status,403)
  assert.equal((await request('/api/admin/referrals/cash/link',{accepted:false,policyVersion:CASH_POLICY},{'x-role':'ADMIN'})).status,400)
  const link=await request('/api/admin/referrals/cash/link',{accepted:true,policyVersion:CASH_POLICY},{'x-role':'ADMIN'});assert.equal(link.status,200);const first=await link.json()
  assert.equal((await(await request('/api/admin/referrals/cash/link',{accepted:true,policyVersion:CASH_POLICY},{'x-role':'ADMIN'})).json()).id,first.id)
  const snapshot=db.prepare('SELECT policy_snapshot AS snapshot,policy_hash AS hash FROM referral_cash_links').get() as {snapshot:string;hash:string};assert.ok(snapshot.snapshot.includes('50%'));assert.match(snapshot.hash,/^[a-f0-9]{64}$/)
  const other=await(await request('/api/admin/referrals/cash',undefined,{'x-role':'ADMIN','x-tenant':'two','x-user':'two'})).json();assert.equal(other.link,null)
  assert.equal((await request('/api/admin/referrals/cash/withdrawals',{amountCents:10000,pixKey:'11144477735',currentPassword:'wrong-password',feesAccepted:true},{'x-role':'ADMIN'})).status,401)
  assert.equal((await request('/api/dev/referrals/cash',undefined,{'x-role':'ADMIN','x-dev-host':'yes'})).status,403)
  assert.equal((await request('/api/dev/referrals/cash',undefined,{'x-role':'DEV'})).status,403)
  assert.equal((await request('/api/dev/referrals/cash',undefined,{'x-role':'DEV','x-dev-host':'yes'})).status,200)
  assert.equal((await request('/api/dev/referrals/cash/withdrawals/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',{action:'SEND',note:'Conferência de teste',currentPassword:password,identityChecked:true,fundsAvailable:true},{'x-role':'DEV','x-dev-host':'yes'})).status,400)
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close()}
})
