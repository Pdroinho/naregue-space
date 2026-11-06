import assert from 'node:assert/strict'
import test from 'node:test'
import { createReferralCashGateway } from './referralCashGateway.js'

test('Pix gateway uses the documented nested destination, required reference and exact cents',async()=>{
 const calls:Array<{path:string;body:unknown}>=[]
 const fetchFn=(async(url,options)=>{const path=new URL(String(url)).pathname;assert.equal(new Headers(options?.headers).get('authorization'),'Bearer test-key');calls.push({path,body:options?.body?JSON.parse(String(options.body)):undefined});return Response.json({success:true,data:path==='/v2/stores/get'?{balance:{available:30000}}:{id:'tran_test',externalId:'naregua-referral-withdrawal',amount:10000,platformFee:80,devMode:false,status:'COMPLETE'}})}) as typeof fetch
 const gateway=createReferralCashGateway('test-key',false,fetchFn)
 await gateway.send({id:'withdrawal',amountCents:10000,key:'11144477735',type:'CPF'})
 assert.deepEqual(calls[0],{path:'/v2/pix/send',body:{amount:10000,externalId:'naregua-referral-withdrawal',description:'Recompensa de indicação NaRégua',pix:{key:'11144477735',type:'CPF'}}})
 assert.equal(await gateway.balance(),30000);assert.equal((await gateway.find('tran_test'))?.id,'tran_test');assert.equal(calls.at(-1)?.path,'/v2/pix/get')
})
test('Pix gateway never retries transport failures or turns provider rejection into success',async()=>{
 let attempts=0
 const gateway=createReferralCashGateway('test-key',true,(async()=>{attempts++;throw Error('timeout')}) as typeof fetch)
 await assert.rejects(gateway.send({id:'withdrawal',amountCents:10000,key:'11144477735',type:'CPF'}));assert.equal(attempts,1)
 const denied=createReferralCashGateway('test-key',true,(async()=>Response.json({success:false,error:'Insufficient permissions'},{status:403})) as typeof fetch)
 await assert.rejects(denied.send({id:'withdrawal',amountCents:10000,key:'11144477735',type:'CPF'}),/não confirmada/)
})
