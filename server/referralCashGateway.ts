import type { CashGateway,CashTransfer } from './referralCash.js'

export function createReferralCashGateway(apiKey:string,devMode:boolean,fetchFn:typeof fetch=fetch):CashGateway {
  async function request<T>(path:string,body?:unknown):Promise<T>{
    const response=await fetchFn('https://api.abacatepay.com/v2'+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
    const result=await response.json() as {success?:boolean;data?:T}
    if(!response.ok||result.success!==true||!result.data)throw Error('Operação não confirmada pela AbacatePay.')
    return result.data
  }
  return{devMode,send:input=>request<CashTransfer>('/pix/send',{amount:input.amountCents,externalId:`naregua-referral-${input.id}`,description:'Recompensa de indicação NaRégua',pix:{key:input.key,type:input.type}}),
    find:providerId=>request<CashTransfer>('/pix/get?id='+encodeURIComponent(providerId)),
    balance:async()=>{const store=await request<{balance:{available:number}}>('/stores/get');if(!Number.isSafeInteger(store.balance.available)||store.balance.available<0)throw Error('Saldo não confirmado.');return store.balance.available}}
}
