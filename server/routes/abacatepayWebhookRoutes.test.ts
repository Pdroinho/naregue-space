import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { once } from 'node:events'
import express from 'express'
import Database from 'better-sqlite3'
import { migrate } from '../migrate.js'
import { env } from '../env.js'
import { ABACATEPAY_PUBLIC_KEY, createAbacatepayWebhookRouter } from '../abacatepayWebhook.js'
import { createPaymentWebhookRuntime } from '../paymentWebhookRuntime.js'

test('webhook requires secret + exact signature, persists event once, and records authenticated reversals',async()=>{
  const db=new Database(':memory:');migrate(db)
  env.ABACATEPAY_WEBHOOK_SECRET='a'.repeat(40);env.ABACATEPAY_DEV_MODE=true
  db.prepare("INSERT INTO abacatepay_checkouts(external_id,provider_id,amount_cents,created_at,updated_at) VALUES('order','bill_test',7490,'now','now')").run()
  const runtime=createPaymentWebhookRuntime(db,{confirmOrder:async()=>false})
  const app=express()
  app.use(express.json({inflate:false,verify:(req,_res,buffer)=>{(req as typeof req &{rawBody?:Buffer}).rawBody=Buffer.from(buffer)}}))
  app.use(createAbacatepayWebhookRouter(db,runtime))
  const server=app.listen(0,'127.0.0.1');await once(server,'listening')
  const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`
  async function send(eventId:string,event:string,secret=env.ABACATEPAY_WEBHOOK_SECRET,signatureValid=true) {
    const body=JSON.stringify({id:eventId,event,apiVersion:2,devMode:true,data:{checkout:{id:'bill_test'}}})
    const signature=createHmac('sha256',ABACATEPAY_PUBLIC_KEY).update(body).digest('base64')
    return fetch(`${origin}/abacatepay?webhookSecret=${secret}`,{method:'POST',headers:{'content-type':'application/json','x-webhook-signature':signatureValid?signature:'wrong'},body})
  }
  try{
    assert.equal((await send('one','checkout.completed','wrong')).status,401)
    assert.equal((await send('one','checkout.completed',undefined,false)).status,401)
    assert.equal((await send('one','checkout.completed')).status,200)
    assert.equal((await send('one','checkout.completed')).status,200)
    assert.equal((db.prepare('SELECT count(*) n FROM abacatepay_webhook_events').get() as {n:number}).n,1)
    assert.equal((await send('one','checkout.refunded')).status,409)
    assert.equal((await send('two','checkout.refunded')).status,200)
    assert.equal((db.prepare('SELECT reversal_event e FROM abacatepay_checkouts').get() as {e:string}).e,'checkout.refunded')
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close()}
})
