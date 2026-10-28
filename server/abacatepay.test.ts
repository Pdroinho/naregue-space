import { createPaymentBillingService } from './paymentBillingService.js'
import { createPaymentWebhookRuntime } from './paymentWebhookRuntime.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { createHmac } from 'node:crypto'
import { migrate } from './migrate.js'
import { createPaymentClient } from './payment.js'
import { ABACATEPAY_PUBLIC_KEY, validAbacatepaySignature } from './abacatepayWebhook.js'

function fixture() {
  const db = new Database(':memory:'); migrate(db)
  const calls: {url:string;body?:Record<string,unknown>}[] = []
  let externalId = '', status = 'PENDING', paidAmount: number | null = null, amount = 7490, mode = true
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({url:String(url),body})
    assert.equal(new Headers(init?.headers).get('authorization'),'Bearer test-key')
    if (String(url).endsWith('/customers/create')) return Response.json({success:true,data:{id:'cust_test',devMode:mode}})
    if (String(url).endsWith('/products/create')) return Response.json({success:true,data:{id:'prod_test'}})
    if (String(url).endsWith('/checkouts/create')) externalId = body.externalId
    if (String(url).endsWith('/checkouts/create')) assert.match(externalId,/^naregua-sandbox-/)
    return Response.json({success:true,data:{id:'bill_test',externalId,url:'https://app.abacatepay.com/pay/bill_test',status,devMode:mode,amount,paidAmount}})
  }) as typeof fetch
  const provider = createPaymentClient({db,apiKey:'test-key',devMode:true,appBaseUrl:'https://naregua.space',fetchFn})
  return {db,provider,calls,setState:(value:{status?:string;paidAmount?:number;amount?:number;mode?:boolean})=>{
    status=value.status??status; paidAmount=value.paidAmount??paidAmount;amount=value.amount??amount;mode=value.mode??mode
  }}
}
test('AbacatePay v2 creates product + one-time checkout with cents and persistent provider IDs', async()=>{
  const {db,provider,calls}=fixture()
  try {
    const checkout=await provider.createPaymentLink({name:'NaRégua',description:'Equipe',amountCents:7490,checkoutIntentId:'a72e667c-b20f-4c76-b5ad-457741241f5b'})
    assert.equal(checkout.linkId,1)
    assert.equal(calls[0].body?.price,7490)
    assert.deepEqual(calls[1].body?.items,[{id:'prod_test',quantity:1}])
    assert.deepEqual(calls[1].body?.methods,['PIX','CARD'])
    assert.equal(calls[1].body?.completionUrl,'https://naregua.space/api/public/onboarding/checkout-return?intent=a72e667c-b20f-4c76-b5ad-457741241f5b')
    assert.match(String(calls[1].body?.externalId),/^naregua-/)
    assert.equal((db.prepare('SELECT provider_id p FROM abacatepay_checkouts').get() as {p:string}).p,'bill_test')
  } finally {db.close()}
})
test('payment requires paid status, exact amount, checkout association and matching environment; reversals are detected',async()=>{
  const {db,provider,setState}=fixture()
  try {
    await provider.createPaymentLink({name:'NaRégua',description:'Equipe',amountCents:7490})
    const order={linkId:1,orderId:1,expectedAmountCents:7490}
    assert.equal(await provider.verifyPaymentLinkOrder(order),false)
    setState({status:'PAID',paidAmount:7490})
    assert.equal(await provider.verifyPaymentLinkOrder(order),true)
    assert.equal(await provider.verifyPaymentLinkOrder({...order,orderId:2}),false)
    setState({amount:7500}); await assert.rejects(provider.verifyPaymentLinkOrder(order),/corresponde/)
    setState({amount:7490,mode:false});await assert.rejects(provider.verifyPaymentLinkOrder(order),/ambiente/)
    setState({mode:true,status:'REFUNDED'});assert.equal(await provider.inspectPaymentLinkOrder(order),'REVERSED')
  } finally {db.close()}
})
test('catalog and customer survive adapter restart; names never turn into per-buyer products', async()=>{
 const {db,provider,calls}=fixture()
 try{
  const input={name:'Barbearia A',productName:'NaRégua · 1 a 3 profissionais',catalogKey:'team:TEAM_3',description:'Equipe',amountCents:7490,customer:{name:'João Silva',email:'JOAO@example.com',cellphone:'+5571999999999'}}
  await provider.createPaymentLink(input)
  const fetchFn=(async(url:string|URL|Request,init?:RequestInit)=>{
   calls.push({url:String(url),body:JSON.parse(String(init?.body))})
   assert.ok(String(url).endsWith('/checkouts/create'),'cached customer and product must be reused')
   const body=JSON.parse(String(init?.body));return Response.json({success:true,data:{id:'bill_other',externalId:body.externalId,url:'https://app.abacatepay.com/pay/bill_other',status:'PENDING',devMode:true,amount:7490,paidAmount:null}})
  }) as typeof fetch
  const restarted=createPaymentClient({db,apiKey:'test-key',devMode:true,appBaseUrl:'https://naregua.space',fetchFn})
  await restarted.createPaymentLink({...input,name:'Barbearia B'})
  assert.equal(calls.filter(c=>c.url.endsWith('/products/create')).length,1)
  assert.equal(calls.filter(c=>c.url.endsWith('/customers/create')).length,1)
  assert.deepEqual(calls.find(c=>c.url.endsWith('/customers/create'))?.body,{name:'João Silva',email:'joao@example.com',cellphone:'+5571999999999'})
  assert.equal(calls.find(c=>c.url.endsWith('/products/create'))?.body?.name,input.productName)
  for(const checkout of calls.filter(c=>c.url.endsWith('/checkouts/create')))assert.equal(checkout.body?.customerId,'cust_test')
 }finally{db.close()}
})
test('catalog separates quoted prices and concurrent creation never creates duplicate products',async()=>{
 const {db,provider,calls}=fixture()
 try{
  const input={name:'A',description:'Equipe',catalogKey:'team:TEAM_3',amountCents:7490}
  const results=await Promise.allSettled([provider.createPaymentLink(input),provider.createPaymentLink(input)])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(calls.filter(c=>c.url.endsWith('/products/create')).length,1)
  // Different quoted amount gets its own stable catalog variant, even if the response is refused.
  await assert.rejects(provider.createPaymentLink({...input,amountCents:5992}),/incompatível/)
  assert.equal(calls.filter(c=>c.url.endsWith('/products/create')).length,2)
  const products=calls.filter(c=>c.url.endsWith('/products/create'))
  assert.notEqual(products[0].body?.externalId,products[1].body?.externalId)
 }finally{db.close()}
})
test('restricted customer permission preserves checkout and never embeds PII in URLs or metadata',async()=>{
 const {db}=fixture();const bodies:Record<string,unknown>[]=[]
 try{
  const fetchFn=(async(url:string|URL|Request,init?:RequestInit)=>{
   const body=JSON.parse(String(init?.body));bodies.push(body)
   if(String(url).endsWith('/customers/create'))return Response.json({success:false,error:'Insufficient permissions'},{status:403})
   if(String(url).endsWith('/products/create'))return Response.json({success:true,data:{id:'prod_shared'}})
   return Response.json({success:true,data:{id:'bill_prefill_denied',externalId:body.externalId,url:'https://app.abacatepay.com/pay/bill_prefill_denied',status:'PENDING',devMode:true,amount:7490,paidAmount:null}})
  }) as typeof fetch
  const provider=createPaymentClient({db,apiKey:'restricted-key',devMode:true,appBaseUrl:'https://naregua.space',fetchFn})
  const result=await provider.createPaymentLink({name:'Shop',description:'Equipe',amountCents:7490,customer:{email:'private@example.com',name:'Private Name'}})
  assert.match(result.checkoutUrl,/bill_prefill_denied/)
  const checkout=bodies.at(-1)!
  assert.equal(checkout.customerId,undefined)
  assert.ok(!JSON.stringify(checkout).includes('private@example.com'))
  assert.ok(!JSON.stringify(checkout).includes('Private Name'))
 }finally{db.close()}
})
test('ambiguous product timeout keeps durable reservation and cannot duplicate on retry',async()=>{
 const {db}=fixture();let attempts=0
 try{
  const fetchFn=(async()=>{attempts++;throw new Error('timeout after provider accepted request')}) as typeof fetch
  const provider=createPaymentClient({db,apiKey:'timeout-key',devMode:true,appBaseUrl:'https://naregua.space',fetchFn})
  const input={name:'Shop',catalogKey:'team:TEAM_3',description:'Equipe',amountCents:7490}
  await assert.rejects(provider.createPaymentLink(input),/Consulte o pedido/)
  await assert.rejects(provider.createPaymentLink(input),/produto ainda/)
  assert.equal(attempts,1)
  assert.equal((db.prepare('SELECT count(*) n FROM abacatepay_catalog WHERE provider_id IS NULL').get() as {n:number}).n,1)
 }finally{db.close()}
})
test('non-JSON gateway 403 is not misclassified as missing API permission',async()=>{
 const {db}=fixture()
 try{
  const fetchFn=(async()=>new Response('error code: 1010',{status:403})) as typeof fetch
  const provider=createPaymentClient({db,apiKey:'gateway-test-key',devMode:true,appBaseUrl:'https://naregua.space',fetchFn})
  await assert.rejects(provider.createPaymentLink({name:'Shop',description:'Equipe',amountCents:7490,customer:{email:'buyer@example.com'}}),error=>{
   assert.equal((error as {permissionDenied:boolean}).permissionDenied,false)
   return true
  })
  assert.equal((db.prepare('SELECT count(*) n FROM abacatepay_catalog').get() as {n:number}).n,0)
 }finally{db.close()}
})
test('webhook integrity is checked against exact raw bytes, not reserialized JSON',()=>{
  const raw=Buffer.from('{ "event": "checkout.completed" }')
  const signature=createHmac('sha256',ABACATEPAY_PUBLIC_KEY).update(raw).digest('base64')
  assert.equal(validAbacatepaySignature(raw,signature),true)
  assert.equal(validAbacatepaySignature(Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),signature),false)
  assert.equal(validAbacatepaySignature(raw,''),false)
})

test('v2 adapter + durable worker grant exactly one paid period and reverse only its own purchase',async()=>{
 const {db,provider,setState}=fixture()
 try{
  db.prepare("INSERT INTO tenants(id,slug,name,primary_color,status,created_at) VALUES('tenant','shop','Barbearia','#b85a30','ONBOARDING','2026-01-01')").run()
  const billing=createPaymentBillingService(db,provider), runtime=createPaymentWebhookRuntime(db,billing)
  await billing.startCheckout('tenant','TEAM_3')
  setState({status:'PAID',paidAmount:7490})
  const paid={event:'order_paid',event_type:'order',data:{order_id:1,payment_link_id:1}}
  runtime.receive(paid);await runtime.processPending()
  const period=(db.prepare("SELECT current_period_end p FROM subscriptions WHERE tenant_id='tenant'").get() as {p:string}).p
  assert.ok(period)
  runtime.receive(paid);await runtime.processPending()
  assert.equal((db.prepare("SELECT current_period_end p FROM subscriptions WHERE tenant_id='tenant'").get() as {p:string}).p,period)
  setState({status:'REFUNDED'})
  runtime.receive({...paid,event:'order_refund'});await runtime.processPending()
  assert.equal((db.prepare("SELECT status FROM subscriptions WHERE tenant_id='tenant'").get() as {status:string}).status,'CANCELLED')
  assert.equal((db.prepare("SELECT status FROM tenants WHERE id='tenant'").get() as {status:string}).status,'SUSPENDED')
 }finally{db.close()}
})
