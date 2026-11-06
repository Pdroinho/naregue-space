import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { badRequest, notFound } from './http.js'
import { decryptSecret, encryptSecret, secretHmac } from './secretCrypto.js'
import { validTaxId } from './taxId.js'
import { CASH_POLICY,CASH_REWARD_PERCENT,CASH_MIN_WITHDRAWAL,CASH_HOLD_DAYS } from './referralCashPolicy.js'

export { CASH_POLICY } from './referralCashPolicy.js'
const DAY = 86400000
type Reward = { id:string; ownerTenantId:string; invitedTenantId:string; amountCents:number; status:string; paidAt:string|null; eligibleAt:string|null; secondPaidAt:string|null; reason:string|null }
export type CashTransfer = {id:string;status:string;externalId:string;amount:number;platformFee:number;devMode:boolean;receiptUrl?:string}
export type CashGateway = { send:(input:{id:string;amountCents:number;key:string;type:'CPF'|'CNPJ'})=>Promise<CashTransfer>; find:(id:string)=>Promise<CashTransfer|null>; balance:()=>Promise<number>; devMode:boolean }

export function createReferralCashService(db:Database.Database, gateway:CashGateway|null, now=()=>new Date()) {
  const stamp=()=>now().toISOString()
  function audit(actor:string|null,id:string,action:string,note?:string){db.prepare('INSERT INTO referral_cash_audit(id,actor_id,entity_id,action,created_at,note) VALUES(?,?,?,?,?,?)').run(randomUUID(),actor,id,action,stamp(),note??null)}
  function document(tenantId:string){const row=db.prepare("SELECT billing_tax_id_enc AS value FROM users WHERE tenant_id=? AND role='ADMIN' ORDER BY created_at,id LIMIT 1").get(tenantId) as {value:string|null}|undefined;return row?.value?decryptSecret(row.value,`billing:${tenantId}`).replace(/\D/g,''):null}
  // Existing paying identities cannot become new customers by recreating a space.
  for(const row of db.prepare("SELECT DISTINCT i.tenant_id AS tenantId FROM payment_checkout_intents i JOIN abacatepay_checkouts c ON c.id=i.payment_link_id WHERE i.status='PAID' AND c.external_id NOT LIKE 'naregua-sandbox-%' AND NOT EXISTS(SELECT 1 FROM referral_cash_rewards r WHERE r.intent_id=i.id)").all() as {tenantId:string}[]){const identity=document(row.tenantId);if(identity&&validTaxId(identity)){const hash=secretHmac(identity,'cash-referral-identity');db.prepare('INSERT OR IGNORE INTO referral_cash_claims(identity_hash,reward_id,created_at) VALUES(?,?,?)').run(hash,'prior:'+hash,stamp())}}
  function reward(id:string){const row=db.prepare('SELECT id,owner_tenant_id AS ownerTenantId,invited_tenant_id AS invitedTenantId,amount_cents AS amountCents,status,paid_at AS paidAt,eligible_at AS eligibleAt,second_paid_at AS secondPaidAt,reason FROM referral_cash_rewards WHERE id=?').get(id) as Reward|undefined;if(!row)throw notFound('Recompensa não encontrada.');return row}
  function isCashIntent(intentId:string){return Boolean(db.prepare('SELECT 1 FROM referral_cash_rewards WHERE intent_id=?').get(intentId))}
  function snapshot(intentId:string){
    const row=db.prepare(`SELECT rr.id AS redemptionId,rr.invited_tenant_id AS invitedTenantId,rl.owner_tenant_id AS ownerTenantId,i.amount_cents AS amountCents
      FROM payment_checkout_intents i JOIN referral_redemptions rr ON rr.id=i.referral_redemption_id JOIN referral_cash_links cl ON cl.link_id=rr.link_id JOIN referral_links rl ON rl.id=cl.link_id WHERE i.id=?`).get(intentId) as {redemptionId:string;invitedTenantId:string;ownerTenantId:string;amountCents:number}|undefined
    if(!row||!row.ownerTenantId||row.amountCents<=0)return
    // Calculate once from the actual payment, rounded to the nearest cent.
    db.prepare("INSERT INTO referral_cash_rewards(id,redemption_id,intent_id,owner_tenant_id,invited_tenant_id,policy_version,amount_cents,status,created_at) VALUES(?,?,?,?,?,?,?,'RESERVED',?) ON CONFLICT(redemption_id) DO UPDATE SET intent_id=excluded.intent_id,amount_cents=excluded.amount_cents,status='RESERVED',reason=NULL WHERE referral_cash_rewards.paid_at IS NULL").run(randomUUID(),row.redemptionId,intentId,row.ownerTenantId,row.invitedTenantId,CASH_POLICY,Math.round(row.amountCents/2),stamp())
  }
  function paid(tenantId:string,intentId:string){
    const row=db.prepare('SELECT id FROM referral_cash_rewards WHERE intent_id=? AND invited_tenant_id=?').get(intentId,tenantId) as {id:string}|undefined
    const source=db.prepare('SELECT c.external_id AS externalId FROM payment_checkout_intents i JOIN abacatepay_checkouts c ON c.id=i.payment_link_id WHERE i.id=? AND i.tenant_id=?').get(intentId,tenantId) as {externalId:string}|undefined
    if(source?.externalId.startsWith('naregua-sandbox-')){if(row)db.prepare("UPDATE referral_cash_rewards SET status='REJECTED',reason='SANDBOX' WHERE id=?").run(row.id);return}
    if(!row){const identity=document(tenantId);if(identity&&validTaxId(identity)){const hash=secretHmac(identity,'cash-referral-identity');db.prepare('INSERT OR IGNORE INTO referral_cash_claims(identity_hash,reward_id,created_at) VALUES(?,?,?)').run(hash,'prior:'+hash,stamp())}return}
    if(row){const current=reward(row.id);if(current.status!=='RESERVED')return
      const identity=document(tenantId),ownerIdentity=document(current.ownerTenantId)
      let reason:string|null=null
      if(!identity||!validTaxId(identity))reason='IDENTITY_REVIEW'
      else if(tenantId===current.ownerTenantId||identity===ownerIdentity)reason='SELF_REFERRAL'
      else if(db.prepare('SELECT 1 FROM referral_cash_claims WHERE identity_hash=?').get(secretHmac(identity,'cash-referral-identity')))reason='DUPLICATE_IDENTITY'
      if(identity&&!reason)db.prepare('INSERT INTO referral_cash_claims(identity_hash,reward_id,created_at) VALUES(?,?,?)').run(secretHmac(identity,'cash-referral-identity'),current.id,stamp())
      db.prepare('UPDATE referral_cash_rewards SET status=?,reason=?,paid_at=?,eligible_at=? WHERE id=?').run(reason&&reason!=='IDENTITY_REVIEW'?'REJECTED':'PENDING',reason,stamp(),new Date(now().getTime()+CASH_HOLD_DAYS*DAY).toISOString(),current.id)
      audit(null,current.id,'FIRST_PAYMENT',reason??undefined)
    }
  }
  function renewed(intentId:string,paidAt:string){
    db.prepare("UPDATE referral_cash_rewards SET second_paid_at=COALESCE(second_paid_at,?) WHERE intent_id=? AND status='PENDING' AND paid_at IS NOT NULL AND julianday(?)>=julianday(paid_at)+20").run(paidAt,intentId,paidAt)
  }
  function reverse(intentId:string){db.prepare("UPDATE referral_cash_rewards SET status='REVERSED',reason='PAYMENT_REVERSED' WHERE intent_id=? AND status!='REVERSED'").run(intentId)}
  function failed(intentId:string){db.prepare("UPDATE referral_cash_rewards SET status='REJECTED',reason='CHECKOUT_FAILED' WHERE intent_id=? AND paid_at IS NULL").run(intentId)}
  function balance(tenantId:string){
    const sums=db.prepare("SELECT COALESCE(SUM(CASE WHEN status='AVAILABLE' THEN amount_cents ELSE 0 END),0) AS earned,COALESCE(SUM(CASE WHEN status IN ('PENDING','RESERVED') THEN amount_cents ELSE 0 END),0) AS pending FROM referral_cash_rewards WHERE owner_tenant_id=?").get(tenantId) as {earned:number;pending:number}
    const spent=db.prepare("SELECT COALESCE(SUM(CASE WHEN status='PAID' THEN amount_cents ELSE 0 END),0) AS paid,COALESCE(SUM(CASE WHEN status IN ('REQUESTED','SENDING','UNCERTAIN') THEN amount_cents ELSE 0 END),0) AS reserved FROM referral_cash_withdrawals WHERE owner_tenant_id=?").get(tenantId) as {paid:number;reserved:number}
    return{availableCents:Math.max(0,sums.earned-spent.paid-spent.reserved),pendingCents:sums.pending,reservedCents:spent.reserved,paidCents:spent.paid,debtCents:Math.max(0,spent.paid+spent.reserved-sums.earned)}
  }
  function overview(tenantId:string){return{policy:{version:CASH_POLICY,rewardPercent:CASH_REWARD_PERCENT,holdDays:CASH_HOLD_DAYS,minWithdrawalCents:CASH_MIN_WITHDRAWAL},...balance(tenantId),
    rewards:db.prepare('SELECT r.id,t.name AS invitedName,r.amount_cents AS amountCents,r.status,r.reason,r.paid_at AS paidAt,r.eligible_at AS eligibleAt,r.second_paid_at AS secondPaidAt,r.created_at AS createdAt FROM referral_cash_rewards r LEFT JOIN tenants t ON t.id=r.invited_tenant_id WHERE r.owner_tenant_id=? ORDER BY r.created_at DESC LIMIT 100').all(tenantId),
    withdrawals:db.prepare('SELECT id,amount_cents AS amountCents,status,requested_at AS requestedAt,fee_cents AS feeCents,receipt_url AS receiptUrl,review_note AS reviewNote FROM referral_cash_withdrawals WHERE owner_tenant_id=? ORDER BY requested_at DESC LIMIT 50').all(tenantId),
    link:db.prepare('SELECT rl.token,CASE WHEN rl.active=1 AND rl.redemptions_count<rl.max_redemptions AND (rl.expires_at IS NULL OR rl.expires_at>?) THEN 1 ELSE 0 END AS active FROM referral_cash_links cl JOIN referral_links rl ON rl.id=cl.link_id WHERE rl.owner_tenant_id=? ORDER BY cl.accepted_at DESC LIMIT 1').get(stamp(),tenantId)??null}}
  function review(id:string,actor:string,approve:boolean,note:string){return db.transaction(()=>{
    const row=reward(id);if(row.status!=='PENDING')throw badRequest('Esta recompensa não está pendente de revisão.')
    if(approve){
      if(!row.eligibleAt||row.eligibleAt>stamp()||!row.secondPaidAt)throw badRequest('Aguarde 45 dias e a segunda mensalidade confirmada.')
      if(row.reason)throw badRequest('Resolva a divergência de identidade antes de liberar a recompensa.')
      const ownerDocument=document(row.ownerTenantId),invitedDocument=document(row.invitedTenantId)
      const claim=db.prepare('SELECT identity_hash AS hash FROM referral_cash_claims WHERE reward_id=?').get(id) as {hash:string}|undefined
      if(!ownerDocument||!invitedDocument||!claim||claim.hash!==secretHmac(invitedDocument,'cash-referral-identity')||claim.hash===secretHmac(ownerDocument,'cash-referral-identity'))throw badRequest('A identidade mudou ou há vínculo de titularidade. Recompensa precisa de conferência adicional.','REFERRAL_IDENTITY_REVIEW')
      const payment=db.prepare("SELECT 1 FROM payment_checkout_intents i JOIN abacatepay_checkouts c ON c.id=i.payment_link_id WHERE i.id=(SELECT intent_id FROM referral_cash_rewards WHERE id=?) AND i.status='PAID' AND c.reversal_event IS NULL AND c.external_id NOT LIKE 'naregua-sandbox-%' AND c.last_renewed_cycle IS NOT NULL").get(id)
      if(!payment)throw badRequest('Pagamento e renovação de produção precisam estar confirmados e sem estorno.')
    }
    db.prepare('UPDATE referral_cash_rewards SET status=?,reviewed_by=?,reviewed_at=?,review_note=? WHERE id=?').run(approve?'AVAILABLE':'REJECTED',actor,stamp(),note,id);audit(actor,id,approve?'REWARD_APPROVED':'REWARD_REJECTED',note)
  }).immediate()}
  function requestWithdrawal(tenantId:string,userId:string,key:string,amountCents:number){return db.transaction(()=>{
    if(!Number.isSafeInteger(amountCents)||amountCents<CASH_MIN_WITHDRAWAL||amountCents>balance(tenantId).availableCents)throw badRequest('Valor indisponível. O saque mínimo é R$100.')
    const taxId=document(tenantId),digits=key.replace(/\D/g,'');if(!taxId||!validTaxId(digits)||digits!==taxId)throw badRequest('Use uma chave Pix CPF/CNPJ igual ao documento de cobrança do responsável. O suporte pode ajudar a conferir o cadastro.')
    if(db.prepare("SELECT 1 FROM referral_cash_withdrawals WHERE owner_tenant_id=? AND status IN ('REQUESTED','SENDING','UNCERTAIN')").get(tenantId))throw badRequest('Já existe um saque em análise ou conciliação.')
    const id=randomUUID();db.prepare("INSERT INTO referral_cash_withdrawals(id,owner_tenant_id,requested_by,amount_cents,status,destination_enc,destination_hash,destination_type,requested_at) VALUES(?,?,?,?,'REQUESTED',?,?,?,?)").run(id,tenantId,userId,amountCents,encryptSecret(digits,`cash-pix:${id}`),secretHmac(digits,'cash-pix'),digits.length===11?'CPF':'CNPJ',stamp());audit(userId,id,'WITHDRAWAL_REQUESTED');return{id}
  }).immediate()}
  function rejectWithdrawal(id:string,actor:string,note:string){db.transaction(()=>{const result=db.prepare("UPDATE referral_cash_withdrawals SET status='REJECTED',reviewed_by=?,reviewed_at=?,review_note=? WHERE id=? AND status='REQUESTED'").run(actor,stamp(),note,id);if(result.changes!==1)throw badRequest('Somente saques ainda não enviados podem ser recusados.');audit(actor,id,'WITHDRAWAL_REJECTED',note)}).immediate()}
  function validateTransfer(transfer:CashTransfer,id:string,amount:number){if(transfer.externalId!==`naregua-referral-${id}`||transfer.amount!==amount||transfer.devMode!==gateway?.devMode||!Number.isSafeInteger(transfer.platformFee)||transfer.platformFee<0||transfer.platformFee>=amount||!transfer.id)throw Error('Transferência divergente; conferir no provedor antes de qualquer nova ação.')}
  async function sendWithdrawal(id:string,actor:string,note:string){
    if(!gateway||gateway.devMode)throw badRequest('Repasse Pix de produção ainda não homologado. A solicitação está preservada para análise.')
    const requested=db.prepare("SELECT amount_cents AS amount FROM referral_cash_withdrawals WHERE id=? AND status='REQUESTED'").get(id) as {amount:number}|undefined
    if(!requested)throw badRequest('Saque já processado ou em conciliação.')
    if(await gateway.balance()<requested.amount)throw badRequest('Saldo do provedor insuficiente para repasse.')
    const row=db.transaction(()=>{
      const found=db.prepare("SELECT owner_tenant_id AS tenantId,amount_cents AS amount,destination_enc AS key,destination_type AS type,requested_at AS requestedAt FROM referral_cash_withdrawals WHERE id=? AND status='REQUESTED'").get(id) as {tenantId:string;amount:number;key:string;type:'CPF'|'CNPJ';requestedAt:string}|undefined
      if(!found)throw badRequest('Saque já enviado, recusado ou em conciliação.')
      if(new Date(found.requestedAt).getTime()+48*3600000>now().getTime())throw badRequest('Aguarde a janela de segurança de 48 horas desta solicitação.')
      if(balance(found.tenantId).debtCents>0)throw badRequest('Há estorno ou saldo insuficiente; revise antes do envio.')
      if(document(found.tenantId)!==decryptSecret(found.key,`cash-pix:${id}`))throw badRequest('Documento alterado desde a solicitação. Recuse e peça nova solicitação após conferência.')
      db.prepare("UPDATE referral_cash_withdrawals SET status='SENDING',reviewed_by=?,reviewed_at=?,review_note=? WHERE id=? AND status='REQUESTED'").run(actor,stamp(),note,id);audit(actor,id,'PIX_SEND_STARTED',note);return found
    }).immediate()
    try{const transfer=await gateway.send({id,amountCents:row.amount,key:decryptSecret(row.key,`cash-pix:${id}`),type:row.type});validateTransfer(transfer,id,row.amount)
      if(transfer.status!=='COMPLETE')throw Error('Transferência não concluída; concilie antes de reenviar.')
      db.prepare("UPDATE referral_cash_withdrawals SET status='PAID',provider_id=?,fee_cents=?,receipt_url=?,provider_checked_at=? WHERE id=? AND status='SENDING'").run(transfer.id,transfer.platformFee,transfer.receiptUrl??null,stamp(),id);audit(actor,id,'PIX_PAID')
    }catch{db.prepare("UPDATE referral_cash_withdrawals SET status='UNCERTAIN' WHERE id=? AND status='SENDING'").run(id);throw badRequest('Envio em conciliação. Não repita o Pix; confira a transferência no provedor.','PIX_UNCERTAIN')}
  }
  async function reconcileWithdrawal(id:string,actor:string,providerId:string){if(!gateway)throw badRequest('Provedor indisponível.');const row=db.prepare("SELECT amount_cents AS amount FROM referral_cash_withdrawals WHERE id=? AND status IN ('SENDING','UNCERTAIN')").get(id) as {amount:number}|undefined;if(!row)throw badRequest('Saque não está em conciliação.');const transfer=await gateway.find(providerId);if(!transfer)throw badRequest('Transferência não localizada. Não é seguro reenviar automaticamente.');validateTransfer(transfer,id,row.amount);if(transfer.status==='COMPLETE'){db.prepare("UPDATE referral_cash_withdrawals SET status='PAID',provider_id=?,fee_cents=?,receipt_url=?,provider_checked_at=? WHERE id=?").run(transfer.id,transfer.platformFee,transfer.receiptUrl??null,stamp(),id);audit(actor,id,'PIX_RECONCILED')}else if(transfer.status==='FAILED'){db.prepare("UPDATE referral_cash_withdrawals SET status='REJECTED',provider_id=?,review_note='Transferência falhou e foi devolvida pelo provedor',provider_checked_at=? WHERE id=?").run(transfer.id,stamp(),id);audit(actor,id,'PIX_FAILED')}else throw badRequest('Transferência ainda não concluída.')}
  function destination(id:string,actor:string){const row=db.prepare('SELECT destination_enc AS key,destination_type AS type FROM referral_cash_withdrawals WHERE id=?').get(id) as {key:string;type:string}|undefined;if(!row)throw notFound();audit(actor,id,'DESTINATION_VIEWED');return{key:decryptSecret(row.key,`cash-pix:${id}`),type:row.type}}
  function devOverview(){return{
    rewards:db.prepare(`SELECT r.id,r.owner_tenant_id AS ownerTenantId,t.name AS ownerName,r.amount_cents AS amountCents,r.status,r.reason,r.paid_at AS paidAt,r.eligible_at AS eligibleAt,r.second_paid_at AS secondPaidAt FROM referral_cash_rewards r LEFT JOIN tenants t ON t.id=r.owner_tenant_id ORDER BY CASE WHEN r.status='PENDING' THEN 0 ELSE 1 END,r.created_at ASC LIMIT 100`).all(),
    withdrawals:db.prepare(`SELECT w.id,t.name AS ownerName,w.amount_cents AS amountCents,w.status,w.requested_at AS requestedAt,w.destination_type AS destinationType,w.fee_cents AS feeCents,w.receipt_url AS receiptUrl FROM referral_cash_withdrawals w LEFT JOIN tenants t ON t.id=w.owner_tenant_id ORDER BY CASE WHEN w.status IN ('REQUESTED','SENDING','UNCERTAIN') THEN 0 ELSE 1 END,w.requested_at ASC LIMIT 100`).all(),
  }}
  return{snapshot,isCashIntent,paid,renewed,reverse,failed,overview,balance,review,requestWithdrawal,rejectWithdrawal,sendWithdrawal,reconcileWithdrawal,devOverview,audit,destination}
}
export type ReferralCashService=ReturnType<typeof createReferralCashService>
