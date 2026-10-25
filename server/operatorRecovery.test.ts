import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import Database from 'better-sqlite3'
import express, { type RequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { migrate } from './migrate.js'
import { hashPassword } from './security.js'
import { createAuthSessionRuntime } from './authSessionRuntime.js'
import { createAuthRouter } from './routes/authRoutes.js'
import { handleError } from './http.js'
import { issueOperatorRecoveryCode } from './operatorRecovery.js'
import { createWhatsappOtpChallenge, verifyAndConsumeWhatsappOtpChallenge } from './mfa.js'

test('console recovery needs fresh password challenge, grants no session on delivery failure and consumes only in its browser', async () => {
  const db = new Database(':memory:')
  migrate(db)
  const password = 'local-test-password-123'
  db.prepare(`INSERT INTO users(id,tenant_id,email,password_hash,phone,role,created_at)
    VALUES ('operator',NULL,'operator@example.com',?,'+5571999999999','DEV',?)`).run(await hashPassword(password),new Date().toISOString())
  assert.throws(() => issueOperatorRecoveryCode(db),/Entre primeiro/)
  const pass: RequestHandler = (_req,_res,next)=>next()
  const app=express();app.use(express.json());app.use(cookieParser())
  app.use((req,_res,next)=>{Object.defineProperty(req,'hostname',{value:req.get('x-test-host')||'dev.localhost'});next()})
  app.use('/api/auth',createAuthRouter({db,nodeEnv:'test',isDevHost:host=>host==='dev.localhost',
    authLoginLimiter:pass,authLoginUserLimiter:pass,authWhatsappOtpSendLimiter:pass,authPasswordLimiter:pass,
    authSessionRuntime:createAuthSessionRuntime(db,'test'),sendPlatformWhatsappText:async()=>false,
    normalizeUserE164Phone:value=>value,maskE164Phone:()=>'+55 ** *****-9999',
    recordLegalAcceptance:()=>{},recordPlatformMarketingChoice:()=>({whatsappPromotions:false,changed:false})}))
  app.use(handleError)
  const server=app.listen(0,'127.0.0.1');await once(server,'listening')
  try{
    const address=server.address();assert.ok(address&&typeof address==='object')
    const call=(path:string,body:unknown,cookie?:string,host='dev.localhost')=>fetch(`http://127.0.0.1:${address.port}/api/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json','x-test-host':host,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)})
    const wrong=await call('login',{email:'operator@example.com',password:'wrong-password'})
    assert.equal(wrong.status,401)
    assert.throws(()=>issueOperatorRecoveryCode(db),/Entre primeiro/)
    const login=await call('login',{email:'operator@example.com',password})
    assert.equal(login.status,202)
    assert.deepEqual(await login.json(),{whatsappOtpRequired:true,deliveryFailed:true,operatorRecoveryAvailable:true,phoneMasked:'+55 ** *****-9999'})
    const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie?.startsWith('preauth='))
    assert.equal((db.prepare('SELECT count(*) AS n FROM auth_sessions').get() as {n:number}).n,0)
    const recovery=issueOperatorRecoveryCode(db)
    assert.match(recovery.code,/^\d{6}$/)
    assert.equal((await call('whatsapp-otp/verify',{code:recovery.code})).status,401)
    assert.equal((await call('whatsapp-otp/verify',{code:recovery.code},cookie,'store.localhost')).status,401)
    const verified=await call('whatsapp-otp/verify',{code:recovery.code,trustDevice:false},cookie)
    assert.equal(verified.status,200)
    assert.ok(verified.headers.get('set-cookie')?.includes('session='))
    assert.equal((await call('whatsapp-otp/verify',{code:recovery.code},cookie)).status,401)
    assert.equal((db.prepare('SELECT count(*) AS n FROM trusted_devices').get() as {n:number}).n,0)
    assert.equal((db.prepare("SELECT count(*) AS n FROM security_events WHERE event_type='OPERATOR_RECOVERY_CODE_ISSUED'").get() as {n:number}).n,1)
    assert.equal((db.prepare('SELECT details_json FROM security_events WHERE event_type=?').get('OPERATOR_RECOVERY_CODE_ISSUED') as {details_json:string}).details_json.includes(recovery.code),false)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close()}
})

test('operator recovery rejects expired challenges, changed phones, non-DEV accounts and ambiguous operators', () => {
  const db=new Database(':memory:');migrate(db)
  const insert=db.prepare(`INSERT INTO users(id,email,password_hash,phone,role,created_at) VALUES (?,?,?,'+5571999999999','DEV',?)`)
  insert.run('dev1','one@example.com','hash',new Date().toISOString())
  const challenge=createWhatsappOtpChallenge(db,{userId:'dev1',keepSigned:false,phone:'+5571999999999'})
  db.prepare('UPDATE auth_challenges SET expires_at=?').run('2000-01-01T00:00:00.000Z')
  assert.throws(()=>issueOperatorRecoveryCode(db),/Entre primeiro/)
  db.prepare('UPDATE auth_challenges SET expires_at=?').run('2099-01-01T00:00:00.000Z')
  db.prepare('UPDATE users SET phone=?').run('+5571888888888')
  assert.throws(()=>issueOperatorRecoveryCode(db),/telefone da conta mudou/)
  db.prepare('UPDATE users SET phone=?').run('+5571999999999')
  const recovery=issueOperatorRecoveryCode(db,'ONE@example.com')
  assert.equal(verifyAndConsumeWhatsappOtpChallenge(db,challenge.id,'dev1',recovery.code),true)
  assert.throws(()=>issueOperatorRecoveryCode(db),/Entre primeiro/)
  insert.run('dev2','two@example.com','hash',new Date().toISOString())
  assert.throws(()=>issueOperatorRecoveryCode(db),/único operador/)
  db.prepare("UPDATE users SET role='CLIENT' WHERE id='dev1'").run()
  assert.throws(()=>issueOperatorRecoveryCode(db,'one@example.com'),/único operador/)
  db.close()
})
